// Mô phỏng Đảo Đèn Lồng — luật theo Ticket-02 + docs/notes/assumptions-phase2.md. 60 tick/giây cố định.
import { Rng } from './rng.ts';
import { secToTicks } from './tuning.ts';
import { getMap, groundTop } from './map.ts';
import type { NightMap } from './map.ts';
import type { DrifterState, GameEvent, GameState, InputState, ScenarioSpec, ShadeState, Tuning, Vec3 } from './types.ts';

export const JUMP_VELOCITY = 7;
export const GRAVITY = 20;
export const STEP_UP = 0.25;
export const FALL_Y = -10;
export const RESPAWN_WAIT = 60;
export const MOTE_INITIAL = 20;
export const MOTE_CAP = 30;
export const MOTE_EVERY = 240;
export const DROP_TTL = 480;
export const SHADE_FIRST = 300;
export const SHADE_SPAWNING = 60;
export const SHADE_HOVER = 1.0;
export const SHADE_DETECT = 12;
export const SHADE_LOSE = 18;
export const SHADE_WANDER_SPEED = 1.5;
export const SHADE_SPAWN_MIN_DIST = 15;
export const STUN_PUSH_TICKS = 15;
export const RECOIL_TICKS = 60;
export const RECOIL_DIST = 2;
export const EVICT_TICKS = 30;
export const HIT_DY = 1.5;
export const PICK_DY = 1.5;
export const PULSE_CENTER_Y = 0.8;
export const DRIFTER_EVERY = 1200;
export const DRIFTER_MAX = 2;
export const DRIFTER_SPEED = 7;
export const DRIFTER_IDLE_SPEED = 2;
export const DRIFTER_HOVER = 1.5;
export const DRIFTER_CHASE_CARRIED = 5;
export const DRIFTER_CHASE_DIST = 15;
export const DRIFTER_TOUCH = 1.2;
export const DRIFTER_STEAL = 3;
export const DRIFTER_FLEE = 240;
export const DRIFTER_DROP_VANISH = 120;
export const CHARM_TICKS = 600;
export const CHARM_RESPAWN = 2700;
export const CHARM_SPEED = 7.2;
export const WIND_EVERY = 1800;
export const WIND_TICKS = 300;
export const WIND_SPEED = 2;
export const DRAIN_DIST = 2;
export const DRAIN_BREAK_DIST = 6;
export const FUEL_DRAIN_EVENT_EVERY = 60;
const EPS = 1e-9;

export interface Mote { id: string; x: number; y: number; z: number; kind: 'random' | 'dropped'; ttl: number; pickFrom: number; point: number }
export interface Shade {
  id: string; x: number; y: number; z: number; hover: number; state: ShadeState; stateTicks: number;
  pushLeft: number; pdx: number; pdz: number; recoilLeft: number; rdx: number; rdz: number;
  evictLeft: number; evx: number; evz: number; wx: number; wz: number; target: string | null; drainTicks: number;
}
export interface Drifter { id: string; x: number; y: number; z: number; state: DrifterState; stolen: number; left: number; wx: number; wz: number; dropped: boolean }
export interface Charm { id: string; x: number; y: number; z: number; available: boolean; respawn: number }
/** fuelT: dầu theo đơn vị nguyên 1/60 (100 dầu = 6000) — ADR-0001. */
export interface Lantern { id: string; x: number; y: number; z: number; lit: boolean; deposited: number; fuelT: number; everLit: boolean; relitCount: number }
export interface Player {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; grounded: boolean; fx: number; fz: number;
  carried: number; flames: number; invuln: number; dashCd: number; dashLeft: number; ddx: number; ddz: number;
  pulseCd: number; charm: number; launched: boolean; lvx: number; lvz: number; respawnWait: number; successfulLights: number;
}

export const emptyInput = (): InputState => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false, pause: false });

const r1 = (v: number): number => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const r3 = (v: number): number => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const idNum = (id: string): number => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : NaN; };
export function cmpId(a: string, b: string): number {
  const na = idNum(a), nb = idNum(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}
const dXZ = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);
const nextNum = (ids: string[]): number => Math.max(0, ...ids.map(idNum).filter((n) => !Number.isNaN(n))) + 1;

export class Sim {
  readonly T: Tuning;
  readonly map: NightMap;
  readonly night: number;
  readonly rng: Rng;
  tick = 0;
  simTick = 0;
  paused = false;
  state: GameState = 'playing';
  result: { result: 'won' | 'lost'; reason: string } | null = null;
  score = 0;
  initialTime: number;
  timeLeft: number;
  randomMotes: boolean; randomShades: boolean; randomDrifters: boolean; windEnabled: boolean;
  player: Player;
  lanterns: Lantern[] = [];
  motes: Mote[] = [];
  shades: Shade[] = [];
  drifters: Drifter[] = [];
  charms: Charm[] = [];
  wind = { active: false, dir: 0, left: 0 };
  nextMote = 1; nextShade = 1; nextDrifter = 1;
  prev = { jump: false, interact: false, pulse: false, dash: false, pause: false };
  /** Cảnh benchmark (Ticket-04 §1): tắt sinh thực thể, sát thương, nhặt, hao dầu, điều kiện kết thúc. */
  bench = false;
  readonly K: { stun: number; invuln: number; pulseCd: number; dashCd: number; dash: number };

  constructor(tuning: Tuning, seed: number, night = 1, scenario: ScenarioSpec | null = null) {
    const T = (this.T = tuning);
    this.night = night;
    this.map = getMap(night);
    this.rng = new Rng(seed);
    const sc = scenario ?? {};
    this.K = { stun: secToTicks(T.pulse_stun_s), invuln: secToTicks(T.invuln_s), pulseCd: secToTicks(T.pulse_cooldown_s), dashCd: secToTicks(T.dash_cooldown_s), dash: secToTicks(T.dash_duration_s) };
    const dur = [T.night1_duration_s, T.night2_duration_s, T.night3_duration_s][night - 1];
    this.initialTime = sc.time_left_s ?? dur;
    this.timeLeft = this.initialTime;
    this.randomMotes = sc.random_motes ?? true;
    this.randomShades = sc.random_shades ?? true;
    this.randomDrifters = (sc.random_drifters ?? true) && this.map.drifters;
    this.windEnabled = (sc.wind_enabled ?? true) && this.map.wind;

    const sp = sc.player?.pos ?? this.map.start;
    const pl = sc.player ?? {};
    this.player = {
      x: sp[0], y: sp[1], z: sp[2], vx: 0, vy: 0, vz: 0, grounded: false, fx: 0, fz: 1,
      carried: pl.carried ?? 0, flames: pl.flames ?? T.flames, invuln: pl.invuln_ticks ?? 0,
      dashCd: pl.dash_cd_ticks ?? 0, dashLeft: 0, ddx: 0, ddz: 1, pulseCd: pl.pulse_cd_ticks ?? 0,
      charm: pl.charm_ticks ?? 0, launched: false, lvx: 0, lvz: 0, respawnWait: 0, successfulLights: pl.successful_lights ?? 0,
    };
    const g = groundTop(this.map, sp[0], sp[2]);
    this.player.grounded = g > -Infinity && Math.abs(sp[1] - g) <= EPS + 1e-6;

    this.map.lanterns.forEach((p, i) => this.lanterns.push({ id: `L${i + 1}`, x: p[0], y: p[1], z: p[2], lit: false, deposited: 0, fuelT: 0, everLit: false, relitCount: 0 }));
    for (const u of sc.lanterns ?? []) {
      const l = this.lanterns.find((x) => x.id === u.id)!;
      if (u.pos) { l.x = u.pos[0]; l.y = u.pos[1]; l.z = u.pos[2]; }
      if (u.deposited !== undefined) l.deposited = u.deposited;
      l.lit = u.lit ?? l.deposited >= T.lantern_cost;
      l.fuelT = l.lit ? Math.round((u.fuel ?? T.fuel_max) * 60) : 0;
      l.everLit = u.ever_lit ?? l.lit;
    }

    if (sc.motes) {
      for (const m of sc.motes) this.motes.push({ id: `M${this.nextMote++}`, x: m[0], y: m[1], z: m[2], kind: 'random', ttl: 0, pickFrom: 0, point: -1 });
    } else if (this.randomMotes) {
      const pts = this.map.moteSpawns.map((_, i) => i);
      for (let i = 0; i < MOTE_INITIAL && pts.length; i++) {
        const k = Math.floor(this.rng.next() * pts.length);
        this.addRandomMote(pts.splice(k, 1)[0]);
      }
    }
    if (sc.shades) {
      sc.shades.forEach((s, i) => {
        const gy = groundTop(this.map, s.pos[0], s.pos[2]);
        const sh = this.makeShade(s.id ?? `S${i + 1}`, s.pos[0], s.pos[1], s.pos[2], s.state ?? 'wander', s.state_ticks_left ?? 0);
        sh.target = s.target_lantern_id ?? null;
        sh.hover = s.pos[1] - (gy > -Infinity ? gy : 0);
        this.shades.push(sh);
      });
      this.nextShade = Math.max(nextNum(this.shades.map((s) => s.id)), this.shades.length + 1);
    }
    if (sc.drifters) {
      sc.drifters.forEach((d, i) => this.drifters.push({ id: d.id ?? `D${i + 1}`, x: d.pos[0], y: d.pos[1], z: d.pos[2], state: d.state ?? 'idle', stolen: d.stolen ?? 0, left: d.state === 'flee' ? DRIFTER_FLEE : 0, wx: d.pos[0], wz: d.pos[2], dropped: false }));
      this.nextDrifter = Math.max(nextNum(this.drifters.map((d) => d.id)), this.drifters.length + 1);
    }
    if (sc.charms) {
      sc.charms.forEach((c, i) => {
        const p = c.pos ?? this.map.charms[i] ?? [0, 0, 0];
        this.charms.push({ id: c.id ?? `C${i + 1}`, x: p[0], y: p[1], z: p[2], available: c.available ?? true, respawn: c.respawn_ticks ?? 0 });
      });
    } else {
      this.map.charms.forEach((p, i) => this.charms.push({ id: `C${i + 1}`, x: p[0], y: p[1], z: p[2], available: true, respawn: 0 }));
    }
  }

  private makeShade(id: string, x: number, y: number, z: number, state: ShadeState, ticks: number): Shade {
    const s: Shade = { id, x, y, z, hover: SHADE_HOVER, state, stateTicks: ticks, pushLeft: 0, pdx: 1, pdz: 0, recoilLeft: 0, rdx: 1, rdz: 0, evictLeft: 0, evx: 0, evz: 0, wx: x, wz: z, target: null, drainTicks: 0 };
    if (state === 'recoil') s.recoilLeft = ticks || RECOIL_TICKS;
    if (state === 'stunned' && !ticks) s.stateTicks = this.K.stun;
    return s;
  }

  private addRandomMote(point: number): void {
    const p = this.map.moteSpawns[point];
    this.motes.push({ id: `M${this.nextMote++}`, x: p[0], y: p[1], z: p[2], kind: 'random', ttl: 0, pickFrom: 0, point });
  }

  private addDropped(x: number, z: number, fallbackY: number, t: number): void {
    const g = groundTop(this.map, x, z);
    this.motes.push({ id: `M${this.nextMote++}`, x, y: g > -Infinity ? g : fallbackY, z, kind: 'dropped', ttl: DROP_TTL, pickFrom: t + 1, point: -1 });
  }

  private ground(x: number, z: number): number { return groundTop(this.map, x, z); }
  get litCount(): number { return this.lanterns.filter((l) => l.lit).length; }
  get capacity(): number { return Math.min(this.T.capacity_max, this.T.carry_capacity + 2 * this.player.successfulLights); }
  get winNeed(): number { return Math.ceil(this.T.win_ratio * this.lanterns.length - 1e-9); }
  /** Đèn còn vùng an toàn: đang sáng và fuel ≥ 30 (đúng 30 vẫn an toàn). */
  isSafe(l: Lantern): boolean { return l.lit && l.fuelT >= this.T.low_fuel_threshold * 60; }
  fuel(l: Lantern): number { return l.fuelT / 60; }
  get shadeSpeed(): number { return this.map.shadeSpeed ?? this.T.shade_speed; }
  shadeCanHurt(s: Shade): boolean { return (s.state === 'wander' || s.state === 'chase') && s.evictLeft === 0; }

  /** Giữ Bóng Mực ngoài vùng an toàn đèn đã sáng và ngoài tháp chuông. */
  private blockShade(s: Shade): void {
    const R = this.T.safe_radius;
    for (const l of this.lanterns) {
      if (!this.isSafe(l)) continue;
      const d = dXZ(s.x, s.z, l.x, l.z);
      if (d < R - EPS) {
        let dx = s.x - l.x, dz = s.z - l.z;
        if (d < 1e-12) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        s.x = l.x + dx * R; s.z = l.z + dz * R;
      }
    }
    if (this.map.tower) {
      const d = Math.hypot(s.x, s.z), r = this.map.tower.r + 0.5;
      if (d < r) { const k = d < 1e-12 ? 0 : r / d; s.x = d < 1e-12 ? r : s.x * k; s.z *= k; }
    }
  }
  private settleShadeY(s: Shade): void { const g = this.ground(s.x, s.z); s.y = (g > -Infinity ? g : 0) + s.hover; }
  private settleDrifterY(d: Drifter): void { const g = this.ground(d.x, d.z); d.y = (g > -Infinity ? g : 0) + DRIFTER_HOVER; }

  /** Di chuyển ngang có va chạm vách (trượt theo từng trục). */
  private moveXZ(dx: number, dz: number): void {
    const p = this.player;
    const ok = (x: number, z: number) => this.ground(x, z) <= p.y + STEP_UP;
    if (ok(p.x + dx, p.z + dz)) { p.x += dx; p.z += dz; return; }
    if (dx !== 0 && ok(p.x + dx, p.z)) { p.x += dx; return; }
    if (dz !== 0 && ok(p.x, p.z + dz)) { p.z += dz; }
  }

  step(inp: InputState): GameEvent[] {
    if (this.state === 'won' || this.state === 'lost') return [];
    const T = this.T, p = this.player, K = this.K;
    const t = this.tick + 1;
    const ev: GameEvent[] = [];
    const emit = (name: string, data: Record<string, unknown>): void => { ev.push({ tick: t, name, data }); };

    // 1. input (pause trước)
    const edge = (k: 'jump' | 'interact' | 'pulse' | 'dash' | 'pause') => inp[k] && !this.prev[k];
    const jumpE = edge('jump'), interactE = edge('interact'), pulseE = edge('pulse'), dashE = edge('dash'), pauseE = edge('pause');
    this.prev = { jump: inp.jump, interact: inp.interact, pulse: inp.pulse, dash: inp.dash, pause: inp.pause };
    this.tick = t;
    if (pauseE) {
      this.paused = !this.paused;
      this.state = this.paused ? 'paused' : 'playing';
      if (this.paused) { emit('paused', {}); return ev; }
      emit('resumed', {});
    } else if (this.paused) return ev;
    const st = ++this.simTick;

    // 2. bộ đếm
    this.timeLeft = this.initialTime - st / 60;
    if (p.dashCd > 0) p.dashCd--;
    if (p.pulseCd > 0) p.pulseCd--;
    if (p.invuln > 0) p.invuln--;
    if (p.charm > 0) p.charm--;
    for (const s of this.shades) {
      if ((s.state === 'spawning' || s.state === 'stunned') && s.stateTicks > 0 && --s.stateTicks === 0) s.state = 'wander';
    }
    for (const m of this.motes) if (m.kind === 'dropped') m.ttl--;
    this.motes = this.motes.filter((m) => m.kind !== 'dropped' || m.ttl > 0);
    for (const d of this.drifters) {
      if (d.state === 'flee' && d.left > 0 && --d.left === 0) d.state = 'removed';
    }
    for (const c of this.charms) if (!c.available && c.respawn > 0 && --c.respawn === 0) c.available = true;
    let respawnNow = false;
    if (p.respawnWait > 0 && --p.respawnWait === 0) respawnNow = true;
    if (this.wind.left > 0 && --this.wind.left === 0) this.wind.active = false;
    if (this.windEnabled && st % WIND_EVERY === 0) { this.wind = { active: true, dir: this.rng.next() * 360, left: WIND_TICKS }; }

    // 2b. dầu: hao 1/60 mỗi tick + Bóng Mực đang drain hút 5/60 mỗi tick; ngay sau đó đèn fuel ≤ 0 tắt
    const decay = this.bench ? 0 : Math.round(T.fuel_decay_per_s), drain = this.bench ? 0 : Math.round(T.drain_per_s);
    for (const l of this.lanterns) if (l.lit) l.fuelT -= decay;
    for (const s of this.shades) {
      if (s.state !== 'drain' || !s.target) continue;
      const l = this.lanterns.find((x) => x.id === s.target);
      if (!l || !l.lit) continue;
      l.fuelT -= drain;
      if (++s.drainTicks % FUEL_DRAIN_EVENT_EVERY === 0) emit('fuel_drain', { lantern_id: l.id, shade_id: s.id, fuel: r1(Math.max(0, l.fuelT) / 60) });
    }
    for (const l of this.lanterns) {
      if (l.lit && l.fuelT <= 0) { l.lit = false; l.fuelT = 0; l.deposited = 0; emit('lantern_out', { lantern_id: l.id }); }
    }

    // 3. di chuyển Mây
    const out = p.respawnWait > 0; // đang chờ hồi sinh sau khi rơi
    if (respawnNow) {
      const s = this.map.start;
      Object.assign(p, { x: s[0], y: s[1], z: s[2], vx: 0, vy: 0, vz: 0, grounded: true, fx: 0, fz: 1, launched: false, dashLeft: 0, invuln: K.invuln });
    } else if (!out) {
      let [mx, mz] = inp.move;
      const len = Math.hypot(mx, mz);
      if (len > 1) { mx /= len; mz /= len; }
      const th = (inp.cam_yaw_deg * Math.PI) / 180, c = Math.cos(th), s = Math.sin(th);
      const wx = mx * c + mz * s, wz = -mx * s + mz * c;
      const wl = Math.hypot(wx, wz);
      if (wl > 1e-9) { p.fx = wx / wl; p.fz = wz / wl; }
      if (dashE && p.dashLeft === 0 && (p.dashCd === 0 || p.charm > 0)) {
        p.dashLeft = K.dash;
        p.dashCd = p.charm > 0 ? 0 : K.dashCd;
        if (wl > 1e-9) { p.ddx = wx / wl; p.ddz = wz / wl; } else { p.ddx = p.fx; p.ddz = p.fz; }
        emit('dash', {});
      }
      let vx: number, vz: number;
      if (p.dashLeft > 0) { vx = p.ddx * T.dash_speed; vz = p.ddz * T.dash_speed; }
      else if (p.launched) { vx = p.lvx; vz = p.lvz; }
      else { const sp = p.charm > 0 ? CHARM_SPEED : T.player_speed; vx = wx * sp; vz = wz * sp; }
      if (this.wind.active) { vx += Math.cos(this.wind.dir * Math.PI / 180) * WIND_SPEED; vz += Math.sin(this.wind.dir * Math.PI / 180) * WIND_SPEED; }
      if (p.dashLeft > 0) p.vy = 0;
      else {
        if (jumpE && p.grounded) { p.vy = JUMP_VELOCITY; p.grounded = false; }
        if (!p.grounded) p.vy -= GRAVITY / 60;
      }
      const x0 = p.x, z0 = p.z;
      this.moveXZ(vx / 60, vz / 60);
      p.vx = (p.x - x0) * 60; p.vz = (p.z - z0) * 60;
      if (!p.grounded) p.y += p.vy / 60;
      const g = this.ground(p.x, p.z);
      if (p.grounded) {
        if (g > -Infinity && g >= p.y - STEP_UP) { p.y = g; p.vy = 0; }
        else if (p.dashLeft === 0) p.grounded = false;
      } else if (p.y <= g) { p.y = g; p.vy = 0; p.grounded = true; p.launched = false; }
      if (p.dashLeft > 0) p.dashLeft--;
      if (p.grounded) {
        for (const pad of this.map.pads) {
          if (dXZ(p.x, p.z, pad.x, pad.z) <= pad.r + EPS && Math.abs(p.y - pad.y) < 0.05) {
            const dx = pad.tx - p.x, dz = pad.tz - p.z, d = Math.hypot(dx, dz);
            p.launched = true; p.lvx = (dx / d) * pad.vh; p.lvz = (dz / d) * pad.vh; p.vy = pad.vy; p.grounded = false;
            break;
          }
        }
      }
      if (T.fall_enabled && p.y < FALL_Y) {
        p.flames = Math.max(0, p.flames - 1);
        const lost = p.carried;
        p.carried = 0;
        p.respawnWait = RESPAWN_WAIT;
        Object.assign(p, { vx: 0, vy: 0, vz: 0, launched: false, dashLeft: 0 });
        emit('player_hit', { by: 'fall', flames: p.flames, dropped: 0, lost });
      }
    }
    const active = p.respawnWait === 0;

    // 4. nhặt đom đóm, bùa
    if (active && !this.bench && p.carried < this.capacity) {
      const near = this.motes
        .filter((m) => m.pickFrom <= t && Math.abs(p.y - m.y) <= PICK_DY + EPS)
        .map((m) => ({ m, d: dXZ(m.x, m.z, p.x, p.z) }))
        .filter((o) => o.d <= T.pickup_radius + EPS)
        .sort((a, b) => a.d - b.d || cmpId(a.m.id, b.m.id));
      for (const { m } of near) {
        if (p.carried >= this.capacity) break;
        this.motes.splice(this.motes.indexOf(m), 1);
        p.carried++;
        emit('mote_picked', { carried: p.carried });
      }
    }
    if (active) {
      for (const c of this.charms) {
        if (c.available && dXZ(c.x, c.z, p.x, p.z) <= T.pickup_radius + EPS && Math.abs(p.y - c.y) <= PICK_DY + EPS) {
          c.available = false; c.respawn = CHARM_RESPAWN; p.charm = CHARM_TICKS;
          emit('charm_picked', { charm_id: c.id, charm_ticks: CHARM_TICKS });
        }
      }
    }

    // 5. đèn
    const newlyLit: Lantern[] = [];
    const FMAX = T.fuel_max * 60, LOW = T.low_fuel_threshold * 60;
    if (active && interactE && p.carried > 0) {
      let best: Lantern | null = null, bestD = Infinity;
      for (const l of this.lanterns) {
        if (l.lit && l.fuelT >= FMAX) continue; // chỉ xét đèn nhận được: chưa sáng, hoặc sáng nhưng chưa đầy dầu
        const d = dXZ(l.x, l.z, p.x, p.z);
        if (d > T.interact_radius + EPS) continue;
        if (d < bestD - EPS || (Math.abs(d - bestD) <= EPS && best && cmpId(l.id, best.id) < 0)) { best = l; bestD = d; }
      }
      if (best && best.lit) {
        // châm dầu
        const used = Math.min(p.carried, Math.ceil((FMAX - best.fuelT) / (T.fuel_per_mote * 60)));
        if (used > 0) {
          const wasLow = best.fuelT < LOW;
          best.fuelT = Math.min(FMAX, best.fuelT + T.fuel_per_mote * 60 * used);
          p.carried -= used;
          this.score += used * T.score.per_mote;
          emit('refuel', { lantern_id: best.id, amount: used, fuel: r1(best.fuelT / 60) });
          if (wasLow && best.fuelT >= LOW) newlyLit.push(best); // vùng an toàn bật lại → đẩy Bóng Mực ra
        }
      } else if (best) {
        const cost = best.everLit ? T.relight_cost : T.lantern_cost;
        const amount = Math.min(p.carried, cost - best.deposited);
        if (amount > 0) {
          best.deposited += amount; p.carried -= amount;
          this.score += amount * T.score.per_mote;
          emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
          if (best.deposited >= cost) {
            const relight = best.everLit;
            best.lit = true; best.fuelT = FMAX; best.everLit = true;
            if (relight) best.relitCount++;
            p.successfulLights++;
            this.score += relight ? T.score.per_relight : T.score.per_lantern;
            newlyLit.push(best);
            emit('lantern_lit', { lantern_id: best.id, relight });
          }
        }
      }
    }

    // 6. vùng an toàn: Bóng Mực đang ở trong đèn vừa sáng → ra mép trong 30 tick
    for (const l of newlyLit) {
      for (const s of this.shades) {
        const d = dXZ(s.x, s.z, l.x, l.z);
        if (d >= T.safe_radius - EPS) continue;
        let dx = s.x - l.x, dz = s.z - l.z;
        if (d < 1e-12) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        s.evictLeft = EVICT_TICKS;
        s.evx = (l.x + dx * T.safe_radius - s.x) / EVICT_TICKS; s.evz = (l.z + dz * T.safe_radius - s.z) / EVICT_TICKS;
      }
    }

    // 7. Tỏa Sáng
    if (active && pulseE && p.pulseCd === 0 && p.carried >= T.pulse_cost) {
      p.carried -= T.pulse_cost;
      p.pulseCd = K.pulseCd;
      const cx = p.x, cy = p.y + PULSE_CENTER_Y, cz = p.z;
      const ids: string[] = [];
      for (const s of this.shades) {
        if (Math.hypot(s.x - cx, s.y - cy, s.z - cz) > T.pulse_radius + EPS) continue;
        let dx = s.x - p.x, dz = s.z - p.z; const d = Math.hypot(dx, dz);
        if (d < 1e-12) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        this.score += s.state === 'drain' ? T.score.per_stun_drain : T.score.per_stun;
        s.state = 'stunned'; s.stateTicks = K.stun; s.pushLeft = STUN_PUSH_TICKS; s.pdx = dx; s.pdz = dz; s.recoilLeft = 0; s.target = null;
        ids.push(s.id);
      }
      for (const d of this.drifters) {
        if (Math.hypot(d.x - cx, d.y - cy, d.z - cz) > T.pulse_radius + EPS) continue;
        if (d.state === 'chase') { d.state = 'flee'; d.left = DRIFTER_FLEE; }
        else if (d.state === 'flee' && d.stolen > 0) {
          const n = d.stolen;
          for (let i = 0; i < n; i++) this.addDropped(d.x, d.z, p.y, t);
          d.stolen = 0; d.dropped = true; d.left = DRIFTER_DROP_VANISH;
          emit('drifter_drop', { drifter_id: d.id, amount: n });
        }
      }
      emit('pulse', { stunned_ids: ids });
    }

    // 8. Bóng Mực, Gió Lạc
    const sv = this.shadeSpeed / 60;
    for (const s of this.shades) {
      if (s.evictLeft > 0) { s.x += s.evx; s.z += s.evz; s.evictLeft--; this.settleShadeY(s); continue; }
      if (s.state === 'stunned') {
        if (s.pushLeft > 0) { s.x += s.pdx * (T.pulse_push_m / STUN_PUSH_TICKS); s.z += s.pdz * (T.pulse_push_m / STUN_PUSH_TICKS); s.pushLeft--; }
      } else if (s.state === 'recoil') {
        s.x += s.rdx * (RECOIL_DIST / RECOIL_TICKS); s.z += s.rdz * (RECOIL_DIST / RECOIL_TICKS);
        if (--s.recoilLeft <= 0) s.state = 'wander';
      } else if (s.state === 'drain') {
        const l = this.lanterns.find((x) => x.id === s.target);
        if (active && dXZ(s.x, s.z, p.x, p.z) <= DRAIN_BREAK_DIST + EPS) { s.state = 'chase'; s.target = null; }
        else if (!l || !l.lit || l.fuelT >= LOW || dXZ(s.x, s.z, l.x, l.z) > DRAIN_DIST + EPS) { s.state = 'wander'; s.target = null; }
      } else if (s.state === 'wander' || s.state === 'chase') {
        const d = dXZ(s.x, s.z, p.x, p.z);
        if (!active) s.state = 'wander';
        else if (s.state === 'wander' && d <= SHADE_DETECT + EPS) s.state = 'chase';
        else if (s.state === 'chase' && d > SHADE_LOSE + EPS) s.state = 'wander';
        let tx = p.x, tz = p.z, v = sv;
        let weak: Lantern | null = null;
        if (s.state === 'wander') {
          // mục tiêu: đèn sáng có fuel < 30 gần nhất → đèn tắt gần nhất → điểm ngẫu nhiên
          // tìm gần nhất (bằng nhau thì id nhỏ hơn) không cấp phát mảng — tránh GC giật khung khi có 200 Bóng Mực
          let wl: Lantern | null = null, wd = Infinity, ul: Lantern | null = null, ud = Infinity;
          for (const l of this.lanterns) {
            const dl = dXZ(l.x, l.z, s.x, s.z);
            if (l.lit && l.fuelT < LOW) { if (dl < wd || (dl === wd && wl && cmpId(l.id, wl.id) < 0)) { wl = l; wd = dl; } }
            else if (!l.lit) { if (dl < ud || (dl === ud && ul && cmpId(l.id, ul.id) < 0)) { ul = l; ud = dl; } }
          }
          weak = wl;
          const goal = weak ?? ul;
          if (goal) { tx = goal.x; tz = goal.z; }
          else {
            if (dXZ(s.x, s.z, s.wx, s.wz) < 0.5) {
              const w = this.map.moteSpawns[Math.floor(this.rng.next() * this.map.moteSpawns.length)];
              s.wx = w[0]; s.wz = w[2];
            }
            tx = s.wx; tz = s.wz;
          }
          v = SHADE_WANDER_SPEED / 60;
        }
        const dx = tx - s.x, dz = tz - s.z, dd = Math.hypot(dx, dz);
        if (weak && dd <= DRAIN_DIST + EPS) { /* đã tới */ }
        else if (dd <= v) { s.x = tx; s.z = tz; } else if (dd > 0) { s.x += (dx / dd) * v; s.z += (dz / dd) * v; }
        if (weak && dXZ(s.x, s.z, weak.x, weak.z) <= DRAIN_DIST + EPS) { s.state = 'drain'; s.target = weak.id; s.drainTicks = 0; }
      }
      this.blockShade(s);
      this.settleShadeY(s);
    }
    for (const d of this.drifters) {
      if (d.state === 'removed') continue;
      const dist = dXZ(d.x, d.z, p.x, p.z);
      if (d.state === 'idle' || d.state === 'chase') {
        d.state = active && p.carried >= DRIFTER_CHASE_CARRIED && dist <= DRIFTER_CHASE_DIST + EPS ? 'chase' : 'idle';
      }
      let tx: number, tz: number, v: number;
      if (d.state === 'chase') { tx = p.x; tz = p.z; v = DRIFTER_SPEED / 60; }
      else if (d.state === 'flee') {
        let ax = d.x - p.x, az = d.z - p.z; const a = Math.hypot(ax, az);
        if (a < 1e-12) { ax = 1; az = 0; } else { ax /= a; az /= a; }
        tx = d.x + ax * 100; tz = d.z + az * 100; v = DRIFTER_SPEED / 60;
      } else {
        if (dXZ(d.x, d.z, d.wx, d.wz) < 0.5) {
          const w = this.map.shadeSpawns[Math.floor(this.rng.next() * this.map.shadeSpawns.length)];
          d.wx = w[0]; d.wz = w[2];
        }
        tx = d.wx; tz = d.wz; v = DRIFTER_IDLE_SPEED / 60;
      }
      const dx = tx - d.x, dz = tz - d.z, dd = Math.hypot(dx, dz);
      if (dd <= v) { d.x = tx; d.z = tz; } else if (dd > 0) { d.x += (dx / dd) * v; d.z += (dz / dd) * v; }
      this.settleDrifterY(d);
    }

    // 9. chạm: Gió Lạc cướp trước, rồi Bóng Mực (id tăng dần)
    if (active && !this.bench) {
      for (const d of [...this.drifters].sort((a, b) => cmpId(a.id, b.id))) {
        if ((d.state !== 'idle' && d.state !== 'chase') || d.dropped || p.carried <= 0) continue;
        if (dXZ(d.x, d.z, p.x, p.z) > DRIFTER_TOUCH + EPS) continue;
        const amount = Math.min(DRIFTER_STEAL, p.carried);
        p.carried -= amount; d.stolen = amount; d.state = 'flee'; d.left = DRIFTER_FLEE;
        emit('drifter_steal', { drifter_id: d.id, amount, carried: p.carried });
      }
      for (const s of [...this.shades].sort((a, b) => cmpId(a.id, b.id))) {
        if (!this.shadeCanHurt(s)) continue;
        if (dXZ(s.x, s.z, p.x, p.z) > T.shade_hit_radius + EPS || Math.abs(p.y - s.y) > HIT_DY + EPS) continue;
        if (p.invuln > 0) continue; // chạm lúc Mây bất tử: không làm gì
        p.flames = Math.max(0, p.flames - 1);
        const dropped = Math.floor(p.carried * T.hit_drop_ratio + EPS);
        p.carried -= dropped;
        for (let i = 0; i < dropped; i++) {
          const a = this.rng.next() * 2 * Math.PI, r = 1.5 + this.rng.next();
          this.addDropped(p.x + r * Math.cos(a), p.z + r * Math.sin(a), p.y, t);
        }
        p.invuln = K.invuln;
        let dx = s.x - p.x, dz = s.z - p.z; const dd = Math.hypot(dx, dz);
        if (dd < 1e-12) { dx = 1; dz = 0; } else { dx /= dd; dz /= dd; }
        s.state = 'recoil'; s.recoilLeft = RECOIL_TICKS; s.rdx = dx; s.rdz = dz;
        emit('player_hit', { by: 'shade', flames: p.flames, dropped });
        break; // tối đa 1 lần mất Ngọn Lửa mỗi tick
      }
    }

    // 10. sinh theo lịch
    if (this.bench) return ev;
    if (this.randomMotes && st % MOTE_EVERY === 0 && this.motes.length < MOTE_CAP) {
      const used = new Set(this.motes.filter((m) => m.kind === 'random').map((m) => m.point));
      const free = this.map.moteSpawns.map((_, i) => i).filter((i) => !used.has(i));
      if (free.length) this.addRandomMote(free[Math.floor(this.rng.next() * free.length)]);
    }
    if (this.randomShades && st >= SHADE_FIRST && (st - SHADE_FIRST) % this.map.shadeInterval === 0) {
      const n = st === SHADE_FIRST ? 2 : 1;
      for (let i = 0; i < n && this.shades.length < this.map.shadeMax; i++) {
        const valid = this.map.shadeSpawns.filter((q) => dXZ(q[0], q[2], p.x, p.z) >= SHADE_SPAWN_MIN_DIST - EPS
          && !this.lanterns.some((l) => this.isSafe(l) && dXZ(q[0], q[2], l.x, l.z) < T.safe_radius - EPS)
          && !this.shades.some((s) => dXZ(q[0], q[2], s.x, s.z) < 0.5));
        if (!valid.length) break;
        const q = valid[Math.floor(this.rng.next() * valid.length)];
        const s = this.makeShade(`S${this.nextShade++}`, q[0], 0, q[2], 'spawning', SHADE_SPAWNING);
        this.settleShadeY(s);
        this.shades.push(s);
        emit('shade_spawned', { id: s.id });
      }
    }
    if (this.randomDrifters && st % DRIFTER_EVERY === 0 && this.drifters.filter((d) => d.state !== 'removed').length < DRIFTER_MAX) {
      const q = this.map.shadeSpawns[Math.floor(this.rng.next() * this.map.shadeSpawns.length)];
      const d: Drifter = { id: `D${this.nextDrifter++}`, x: q[0], y: 0, z: q[2], state: 'idle', stolen: 0, left: 0, wx: q[0], wz: q[2], dropped: false };
      this.settleDrifterY(d);
      this.drifters.push(d);
    }

    // 11. thắng / thua
    if (p.flames <= 0) this.finish('lost', 'no_flames', emit);
    else if (this.timeLeft <= EPS) {
      if (this.litCount >= this.winNeed) {
        for (const l of this.lanterns) if (l.lit) this.score += T.score.per_lantern_at_dawn + Math.floor(l.fuelT / 60);
        this.score += T.score.per_flame_left * p.flames;
        this.finish('won', 'dawn_survived', emit);
      } else this.finish('lost', 'dawn', emit);
    }
    return ev;
  }

  private finish(result: 'won' | 'lost', reason: string, emit: (n: string, d: Record<string, unknown>) => void): void {
    this.state = result;
    this.result = { result, reason };
    emit('game_over', { result, reason });
  }

  snapshot(): Record<string, unknown> {
    const p = this.player;
    const v = (x: number, y: number, z: number): Vec3 => [r3(x), r3(y), r3(z)];
    const s3 = (ticks: number) => r3(ticks / 60);
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.simTick, night: this.night, state: this.state,
      time_left_s: r3(Math.max(0, this.timeLeft)), score: this.score,
      wind: { active: this.wind.active, dir_deg: r3(this.wind.dir) },
      player: {
        pos: v(p.x, p.y, p.z), vel: v(p.vx, p.vy, p.vz), grounded: p.grounded, invuln: p.invuln > 0,
        flames: p.flames, carried: p.carried, capacity: this.capacity, dash_cd_s: s3(p.dashCd), pulse_cd_s: s3(p.pulseCd), charm_s: s3(p.charm),
      },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: v(l.x, l.y, l.z), lit: l.lit, deposited: l.deposited, fuel: r1(l.fuelT / 60), ever_lit: l.everLit, relit_count: l.relitCount })),
      shades: this.shades.map((s) => ({ id: s.id, pos: v(s.x, s.y, s.z), state: s.state })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: v(m.x, m.y, m.z), kind: m.kind, ttl_s: m.kind === 'dropped' ? s3(m.ttl) : null })),
      drifters: this.drifters.map((d) => ({ id: d.id, pos: v(d.x, d.y, d.z), state: d.state, stolen: d.stolen })),
      charms: this.charms.map((c) => ({ id: c.id, pos: v(c.x, c.y, c.z), available: c.available, respawn_s: s3(c.respawn) })),
    };
  }
}
