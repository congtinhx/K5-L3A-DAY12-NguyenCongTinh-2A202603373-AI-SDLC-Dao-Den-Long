// Mô phỏng Đảo Đèn Lồng — luật theo docs/notes/assumptions-phase1.md. 60 tick/giây cố định.
import { Rng } from './rng.ts';
import { secToTicks } from './tuning.ts';
import type { GameEvent, GameState, InputState, ScenarioSpec, Tuning, Vec3 } from './types.ts';

export const ISLAND_RADIUS = 40;
export const LANTERN_RING = 25;
export const MOTE_COUNT = 60;
export const MOTE_MIN_R = 3;
export const MOTE_MAX_R = 38;
export const MOTE_RESPAWN_BELOW = 20;
export const MOTE_RESPAWN_TICKS = 180;
export const SHADE_FIRST_TICK = 600;
export const SHADE_INTERVAL_TICKS = 1200;
export const SHADE_MAX = 6;
export const SHADE_SPAWN_RING = 38;
export const SHADE_SPAWN_MIN_DIST = 15;
export const SHADE_FLOAT_Y = 1.0;
export const JUMP_VELOCITY = 6;
export const GRAVITY = 20;
const EPS = 1e-9;

export interface Mote { id: string; x: number; z: number }
export interface Shade { id: string; x: number; y: number; z: number; stunUntil: number }
export interface Lantern { id: string; x: number; y: number; z: number; lit: boolean; deposited: number }
export interface Player {
  x: number; y: number; z: number; vy: number; carried: number; flames: number; invulnUntil: number; pulseReadyAt: number;
}

export const emptyInput = (): InputState => ({ move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false, dash: false });

const r3 = (v: number): number => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const idNum = (id: string): number => { const m = /(\d+)$/.exec(id); return m ? Number(m[1]) : NaN; };
export function cmpId(a: string, b: string): number {
  const na = idNum(a), nb = idNum(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a < b ? -1 : a > b ? 1 : 0;
}
const distXZ = (ax: number, az: number, bx: number, bz: number): number => Math.hypot(ax - bx, az - bz);

export class Sim {
  readonly T: Tuning;
  readonly rng: Rng;
  tick = 0;
  state: GameState = 'playing';
  result: { result: 'won' | 'lost'; reason: string } | null = null;
  score = 0;
  initialTime: number;
  timeLeft: number;
  randomMotes: boolean;
  randomShades: boolean;
  player: Player;
  lanterns: Lantern[] = [];
  motes: Mote[] = [];
  shades: Shade[] = [];
  nextMote = 1;
  nextShade = 1;
  prev = { jump: false, interact: false, pulse: false };
  private ticks: { stun: number; invuln: number; cooldown: number };

  constructor(tuning: Tuning, seed: number, scenario: ScenarioSpec | null = null) {
    const T = (this.T = tuning);
    this.rng = new Rng(seed);
    const sc = scenario ?? {};
    this.ticks = { stun: secToTicks(T.pulse_stun_s), invuln: secToTicks(T.invuln_s), cooldown: secToTicks(T.pulse_cooldown_s) };
    this.initialTime = sc.time_left_s ?? T.night1_duration_s;
    this.timeLeft = this.initialTime;
    this.randomMotes = sc.random_motes ?? true;
    this.randomShades = sc.random_shades ?? true;

    const pp = sc.player?.pos ?? [0, 0, 0];
    this.player = { x: pp[0], y: pp[1], z: pp[2], vy: 0, carried: sc.player?.carried ?? 0, flames: sc.player?.flames ?? T.flames, invulnUntil: 0, pulseReadyAt: 0 };

    for (let i = 0; i < T.lantern_count_night1; i++) {
      const a = (i * 2 * Math.PI) / T.lantern_count_night1;
      this.lanterns.push({ id: `L${i + 1}`, x: LANTERN_RING * Math.sin(a), y: 0, z: LANTERN_RING * Math.cos(a), lit: false, deposited: 0 });
    }
    for (const u of sc.lanterns ?? []) {
      const l = this.lanterns.find((x) => x.id === u.id)!;
      if (u.pos) { l.x = u.pos[0]; l.y = u.pos[1]; l.z = u.pos[2]; }
      if (u.deposited !== undefined) l.deposited = u.deposited;
      l.lit = u.lit ?? l.deposited >= T.lantern_cost;
    }

    if (sc.motes) {
      for (const m of sc.motes) this.motes.push({ id: `M${this.nextMote++}`, x: m[0], z: m[2] });
    } else if (this.randomMotes) {
      for (let i = 0; i < MOTE_COUNT; i++) this.spawnMote();
    }
    if (sc.shades) {
      sc.shades.forEach((s, i) => this.shades.push({ id: s.id ?? `S${i + 1}`, x: s.pos[0], y: s.pos[1], z: s.pos[2], stunUntil: 0 }));
      const maxId = Math.max(0, ...this.shades.map((s) => idNum(s.id)).filter((n) => !Number.isNaN(n)));
      this.nextShade = Math.max(maxId, this.shades.length) + 1;
    }
  }

  private spawnMote(): void {
    const r = Math.sqrt(this.rng.next() * (MOTE_MAX_R ** 2 - MOTE_MIN_R ** 2) + MOTE_MIN_R ** 2);
    const a = this.rng.next() * 2 * Math.PI;
    this.motes.push({ id: `M${this.nextMote++}`, x: r * Math.sin(a), z: r * Math.cos(a) });
  }

  private spawnShade(): Shade {
    const p = this.player;
    let x = 0, z = 0;
    for (let i = 0; i < 10; i++) {
      const a = this.rng.next() * 2 * Math.PI;
      x = SHADE_SPAWN_RING * Math.sin(a); z = SHADE_SPAWN_RING * Math.cos(a);
      if (distXZ(x, z, p.x, p.z) >= SHADE_SPAWN_MIN_DIST) break;
    }
    const s: Shade = { id: `S${this.nextShade++}`, x, y: SHADE_FLOAT_Y, z, stunUntil: 0 };
    this.constrainShade(s);
    this.shades.push(s);
    return s;
  }

  /** Bóng Mực không ở trong safe_radius của đèn đã thắp, và ở trong đảo. */
  private constrainShade(s: Shade): void {
    const R = this.T.safe_radius;
    for (const l of this.lanterns) {
      if (!l.lit) continue;
      const d = distXZ(s.x, s.z, l.x, l.z);
      if (d < R - EPS) {
        let dx = s.x - l.x, dz = s.z - l.z;
        if (d < 1e-12) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        s.x = l.x + dx * R; s.z = l.z + dz * R;
      }
    }
    const r = Math.hypot(s.x, s.z);
    if (r > ISLAND_RADIUS) { s.x *= ISLAND_RADIUS / r; s.z *= ISLAND_RADIUS / r; }
  }

  isStunned(s: Shade, t = this.tick): boolean { return t < s.stunUntil; }
  get litCount(): number { return this.lanterns.filter((l) => l.lit).length; }

  /** Một bước: đọc input của tick k = this.tick, tạo trạng thái k+1. Trả về các event của bước. */
  step(inp: InputState): GameEvent[] {
    if (this.state !== 'playing') return [];
    const T = this.T, p = this.player;
    const t = this.tick + 1;
    const ev: GameEvent[] = [];
    const emit = (name: string, data: Record<string, unknown>): void => { ev.push({ tick: t, name, data }); };

    // 1. cạnh false→true
    const jumpEdge = inp.jump && !this.prev.jump;
    const interactEdge = inp.interact && !this.prev.interact;
    const pulseEdge = inp.pulse && !this.prev.pulse;
    this.prev = { jump: inp.jump, interact: inp.interact, pulse: inp.pulse };

    // 2. di chuyển + nhảy
    let [mx, mz] = inp.move;
    const len = Math.hypot(mx, mz);
    if (len > 1) { mx /= len; mz /= len; }
    const th = (inp.cam_yaw_deg * Math.PI) / 180;
    const c = Math.cos(th), s = Math.sin(th);
    const v = T.player_speed / 60;
    p.x += (mx * c + mz * s) * v;
    p.z += (-mx * s + mz * c) * v;
    const pr = Math.hypot(p.x, p.z);
    if (pr > ISLAND_RADIUS) { p.x *= ISLAND_RADIUS / pr; p.z *= ISLAND_RADIUS / pr; }
    if (jumpEdge && p.y <= 0) p.vy = JUMP_VELOCITY;
    if (p.y > 0 || p.vy > 0) {
      p.vy -= GRAVITY / 60;
      p.y += p.vy / 60;
      if (p.y <= 0) { p.y = 0; p.vy = 0; }
    }

    // 3. nhặt đom đóm
    if (p.carried < T.carry_capacity) {
      const near = this.motes
        .map((m) => ({ m, d: distXZ(m.x, m.z, p.x, p.z) }))
        .filter((o) => o.d <= T.pickup_radius + EPS)
        .sort((a, b) => a.d - b.d || cmpId(a.m.id, b.m.id));
      for (const { m } of near) {
        if (p.carried >= T.carry_capacity) break;
        this.motes.splice(this.motes.indexOf(m), 1);
        p.carried++;
        this.score += T.score.per_mote;
        emit('mote_picked', { carried: p.carried });
      }
    }

    // 4. nạp đèn
    if (interactEdge && p.carried > 0) {
      let best: Lantern | null = null, bestD = Infinity;
      for (const l of this.lanterns) {
        if (l.lit) continue;
        const d = distXZ(l.x, l.z, p.x, p.z);
        if (d > T.interact_radius + EPS) continue;
        if (d < bestD - EPS || (Math.abs(d - bestD) <= EPS && best && cmpId(l.id, best.id) < 0)) { best = l; bestD = d; }
      }
      if (best) {
        const amount = Math.min(p.carried, T.lantern_cost - best.deposited);
        if (amount > 0) {
          best.deposited += amount; p.carried -= amount;
          emit('deposit', { lantern_id: best.id, amount, deposited: best.deposited });
          if (best.deposited >= T.lantern_cost) {
            best.lit = true; this.score += T.score.per_lantern;
            emit('lantern_lit', { lantern_id: best.id });
            for (const sh of this.shades) this.constrainShade(sh);
          }
        }
      }
    }

    // 5. tỏa sáng
    if (pulseEdge && t >= p.pulseReadyAt && p.carried >= T.pulse_cost) {
      p.carried -= T.pulse_cost;
      p.pulseReadyAt = t + this.ticks.cooldown;
      const ids: string[] = [];
      for (const sh of this.shades) {
        const d = distXZ(sh.x, sh.z, p.x, p.z);
        if (d > T.pulse_radius + EPS) continue;
        sh.stunUntil = t + this.ticks.stun;
        let dx = sh.x - p.x, dz = sh.z - p.z;
        if (d < 1e-12) { dx = 1; dz = 0; } else { dx /= d; dz /= d; }
        sh.x += dx * T.pulse_push_m; sh.z += dz * T.pulse_push_m;
        this.constrainShade(sh);
        ids.push(sh.id);
        this.score += T.score.per_stun;
      }
      emit('pulse', { stunned_ids: ids });
    }

    // 6. Bóng Mực đuổi + sinh mới; sinh thêm đom đóm
    const step = T.shade_speed / 60;
    for (const sh of this.shades) {
      if (this.isStunned(sh, t)) continue;
      const dx = p.x - sh.x, dz = p.z - sh.z, d = Math.hypot(dx, dz);
      if (d <= step) { sh.x = p.x; sh.z = p.z; } else { sh.x += (dx / d) * step; sh.z += (dz / d) * step; }
      this.constrainShade(sh);
    }
    if (this.randomShades && t >= SHADE_FIRST_TICK && (t - SHADE_FIRST_TICK) % SHADE_INTERVAL_TICKS === 0 && this.shades.length < SHADE_MAX) {
      emit('shade_spawned', { id: this.spawnShade().id });
    }
    if (this.randomMotes && this.motes.length < MOTE_RESPAWN_BELOW && t % MOTE_RESPAWN_TICKS === 0) this.spawnMote();

    // 7. bị chạm
    if (t >= p.invulnUntil && this.shades.some((sh) => !this.isStunned(sh, t) && distXZ(sh.x, sh.z, p.x, p.z) <= T.shade_hit_radius + EPS)) {
      p.flames = Math.max(0, p.flames - 1);
      const dropped = Math.floor(p.carried * T.hit_drop_ratio + EPS);
      p.carried -= dropped;
      p.invulnUntil = t + this.ticks.invuln;
      emit('player_hit', { by: 'shade', flames: p.flames, dropped });
    }

    // 8. thời gian
    this.tick = t;
    this.timeLeft = this.initialTime - t / 60;

    // 9. kết thúc
    if (this.lanterns.every((l) => l.lit)) {
      this.score += T.score.per_second_left * Math.floor(Math.max(0, this.timeLeft) + EPS) + T.score.per_flame_left * p.flames;
      this.finish('won', 'all_lit', emit);
    } else if (p.flames <= 0) this.finish('lost', 'no_flames', emit);
    else if (this.timeLeft <= EPS) this.finish('lost', 'dawn', emit);
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
    return {
      type: 'snapshot', tick: this.tick, sim_tick: this.tick, state: this.state,
      time_left_s: r3(Math.max(0, this.timeLeft)), score: this.score,
      player: { pos: v(p.x, p.y, p.z), flames: p.flames, carried: p.carried },
      lanterns: this.lanterns.map((l) => ({ id: l.id, pos: v(l.x, l.y, l.z), lit: l.lit, deposited: l.deposited })),
      shades: this.shades.map((s) => ({ id: s.id, pos: v(s.x, s.y, s.z), state: this.isStunned(s) ? 'stunned' : 'chase' })),
      motes_active: this.motes.length,
      motes: this.motes.map((m) => ({ id: m.id, pos: v(m.x, 0, m.z) })),
    };
  }
}
