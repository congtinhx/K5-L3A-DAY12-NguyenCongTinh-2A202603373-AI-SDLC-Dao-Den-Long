import type { DrifterState, InputFrame, ScenarioSpec, ShadeState, Vec3 } from './types.ts';

const SHADE_STATES: ShadeState[] = ['spawning', 'wander', 'chase', 'recoil', 'stunned', 'drain'];
const DRIFTER_STATES: DrifterState[] = ['idle', 'chase', 'flee', 'removed'];

/** Lỗi định dạng file inputs/scenario → headless thoát mã 2. */
export class FormatError extends Error {}

const fail = (msg: string): never => { throw new FormatError(msg); };
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function parseJson(text: string, what: string): unknown {
  try { return JSON.parse(text); } catch (e) { return fail(`${what}: JSON không hợp lệ (${(e as Error).message})`); }
}
function vec3(v: unknown, where: string): Vec3 {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(isNum)) fail(`${where}: cần [x, y, z] là số`);
  return [v[0], v[1], v[2]] as Vec3;
}
function nonNegInt(v: unknown, where: string): number {
  if (!isNum(v) || !Number.isInteger(v) || v < 0) fail(`${where}: cần số nguyên ≥ 0`);
  return v as number;
}
function bool(v: unknown, where: string): boolean {
  if (typeof v !== 'boolean') fail(`${where}: cần boolean`);
  return v as boolean;
}

export function parseInputs(text: string): InputFrame[] {
  const root = parseJson(text, 'inputs');
  if (!isObj(root) || !Array.isArray(root.frames)) return fail('inputs: cần {"frames": [...]}');
  const frames: InputFrame[] = [];
  let prev = -1;
  (root.frames as unknown[]).forEach((f, i) => {
    const w = `inputs.frames[${i}]`;
    if (!isObj(f)) fail(`${w}: cần object`);
    const fr = f as Record<string, unknown>;
    const tick = nonNegInt(fr.tick, `${w}.tick`);
    if (tick <= prev) fail(`${w}.tick: phải tăng nghiêm ngặt (${tick} sau ${prev})`);
    prev = tick;
    const out: InputFrame = { tick };
    if ('move' in fr) {
      const m = fr.move;
      if (!Array.isArray(m) || m.length !== 2 || !m.every((x) => isNum(x) && x >= -1 && x <= 1)) fail(`${w}.move: cần [x, z] trong [-1, 1]`);
      out.move = [(m as number[])[0], (m as number[])[1]];
    }
    if ('cam_yaw_deg' in fr) { if (!isNum(fr.cam_yaw_deg)) fail(`${w}.cam_yaw_deg: cần số`); out.cam_yaw_deg = fr.cam_yaw_deg as number; }
    for (const k of ['jump', 'interact', 'pulse', 'dash', 'pause'] as const) if (k in fr) out[k] = bool(fr[k], `${w}.${k}`);
    frames.push(out);
  });
  return frames;
}

export function parseScenario(text: string, lanternIds: string[]): ScenarioSpec {
  const r = parseJson(text, 'scenario');
  if (!isObj(r)) return fail('scenario: cần object');
  const sc: ScenarioSpec = {};
  if ('player' in r) {
    if (!isObj(r.player)) fail('scenario.player: cần object');
    const p = r.player as Record<string, unknown>;
    sc.player = {};
    if ('pos' in p) sc.player.pos = vec3(p.pos, 'scenario.player.pos');
    if ('carried' in p) sc.player.carried = nonNegInt(p.carried, 'scenario.player.carried');
    if ('flames' in p) sc.player.flames = nonNegInt(p.flames, 'scenario.player.flames');
    for (const k of ['invuln_ticks', 'dash_cd_ticks', 'pulse_cd_ticks', 'charm_ticks', 'successful_lights'] as const) {
      if (k in p) sc.player[k] = nonNegInt(p[k], `scenario.player.${k}`);
    }
  }
  if ('random_motes' in r) sc.random_motes = bool(r.random_motes, 'scenario.random_motes');
  if ('random_shades' in r) sc.random_shades = bool(r.random_shades, 'scenario.random_shades');
  if ('random_drifters' in r) sc.random_drifters = bool(r.random_drifters, 'scenario.random_drifters');
  if ('wind_enabled' in r) sc.wind_enabled = bool(r.wind_enabled, 'scenario.wind_enabled');
  if ('motes' in r) {
    if (!Array.isArray(r.motes)) fail('scenario.motes: cần mảng');
    sc.motes = (r.motes as unknown[]).map((m, i) => vec3(m, `scenario.motes[${i}]`));
  }
  if ('shades' in r) {
    if (!Array.isArray(r.shades)) fail('scenario.shades: cần mảng');
    const seen = new Set<string>();
    sc.shades = (r.shades as unknown[]).map((s, i) => {
      if (!isObj(s)) fail(`scenario.shades[${i}]: cần object`);
      const so = s as Record<string, unknown>;
      const out: { id?: string; pos: Vec3; state?: ShadeState; state_ticks_left?: number; target_lantern_id?: string } = { pos: vec3(so.pos, `scenario.shades[${i}].pos`) };
      if ('target_lantern_id' in so) {
        if (typeof so.target_lantern_id !== 'string' || !lanternIds.includes(so.target_lantern_id)) fail(`scenario.shades[${i}].target_lantern_id: phải là một trong ${lanternIds.join(', ')}`);
        out.target_lantern_id = so.target_lantern_id as string;
      }
      if ('state' in so) {
        if (!SHADE_STATES.includes(so.state as ShadeState)) fail(`scenario.shades[${i}].state: một trong ${SHADE_STATES.join(', ')}`);
        out.state = so.state as ShadeState;
      }
      if ('state_ticks_left' in so) out.state_ticks_left = nonNegInt(so.state_ticks_left, `scenario.shades[${i}].state_ticks_left`);
      if ('id' in so) {
        if (typeof so.id !== 'string' || so.id === '' || seen.has(so.id)) fail(`scenario.shades[${i}].id: cần chuỗi, không trùng`);
        out.id = so.id as string; seen.add(out.id);
      }
      return out;
    });
  }
  if ('drifters' in r) {
    if (!Array.isArray(r.drifters)) fail('scenario.drifters: cần mảng');
    sc.drifters = (r.drifters as unknown[]).map((d, i) => {
      const w = `scenario.drifters[${i}]`;
      if (!isObj(d)) fail(`${w}: cần object`);
      const o = d as Record<string, unknown>;
      const out: { id?: string; pos: Vec3; state?: DrifterState; stolen?: number } = { pos: vec3(o.pos, `${w}.pos`) };
      if ('id' in o) { if (typeof o.id !== 'string' || o.id === '') fail(`${w}.id: cần chuỗi`); out.id = o.id as string; }
      if ('state' in o) { if (!DRIFTER_STATES.includes(o.state as DrifterState)) fail(`${w}.state: một trong ${DRIFTER_STATES.join(', ')}`); out.state = o.state as DrifterState; }
      if ('stolen' in o) out.stolen = nonNegInt(o.stolen, `${w}.stolen`);
      return out;
    });
  }
  if ('charms' in r) {
    if (!Array.isArray(r.charms)) fail('scenario.charms: cần mảng');
    sc.charms = (r.charms as unknown[]).map((c, i) => {
      const w = `scenario.charms[${i}]`;
      if (!isObj(c)) fail(`${w}: cần object`);
      const o = c as Record<string, unknown>;
      const out: { id?: string; pos?: Vec3; available?: boolean; respawn_ticks?: number } = {};
      if ('id' in o) { if (typeof o.id !== 'string' || o.id === '') fail(`${w}.id: cần chuỗi`); out.id = o.id as string; }
      if ('pos' in o) out.pos = vec3(o.pos, `${w}.pos`);
      if ('available' in o) out.available = bool(o.available, `${w}.available`);
      if ('respawn_ticks' in o) out.respawn_ticks = nonNegInt(o.respawn_ticks, `${w}.respawn_ticks`);
      return out;
    });
  }
  if ('lanterns' in r) {
    if (!Array.isArray(r.lanterns)) fail('scenario.lanterns: cần mảng');
    sc.lanterns = (r.lanterns as unknown[]).map((l, i) => {
      const w = `scenario.lanterns[${i}]`;
      if (!isObj(l)) fail(`${w}: cần object`);
      const lo = l as Record<string, unknown>;
      if (typeof lo.id !== 'string' || !lanternIds.includes(lo.id)) fail(`${w}.id: phải là một trong ${lanternIds.join(', ')}`);
      const out: { id: string; pos?: Vec3; deposited?: number; lit?: boolean; fuel?: number; ever_lit?: boolean } = { id: lo.id as string };
      if ('fuel' in lo) { if (!isNum(lo.fuel) || (lo.fuel as number) < 0 || (lo.fuel as number) > 100) fail(`${w}.fuel: cần số trong [0, 100]`); out.fuel = lo.fuel as number; }
      if ('ever_lit' in lo) out.ever_lit = bool(lo.ever_lit, `${w}.ever_lit`);
      if ('pos' in lo) out.pos = vec3(lo.pos, `${w}.pos`);
      if ('deposited' in lo) out.deposited = nonNegInt(lo.deposited, `${w}.deposited`);
      if ('lit' in lo) out.lit = bool(lo.lit, `${w}.lit`);
      return out;
    });
  }
  if ('time_left_s' in r) {
    if (!isNum(r.time_left_s) || (r.time_left_s as number) < 0) fail('scenario.time_left_s: cần số ≥ 0');
    sc.time_left_s = r.time_left_s as number;
  }
  return sc;
}
