import type { Tuning } from './types.ts';

/** Kiểm tra khối tuning đọc từ game.contract.json (nguồn duy nhất của các con số). */
export function parseTuning(contract: unknown): Tuning {
  const t = (contract as { tuning?: Record<string, unknown> })?.tuning;
  if (!t || typeof t !== 'object') throw new Error('game.contract.json thiếu "tuning"');
  const nums = ['player_speed', 'carry_capacity', 'lantern_cost', 'lantern_count_night1', 'pickup_radius',
    'interact_radius', 'pulse_cost', 'pulse_radius', 'night1_duration_s', 'flames', 'invuln_s', 'hit_drop_ratio',
    'pulse_stun_s', 'pulse_push_m', 'pulse_cooldown_s', 'safe_radius', 'shade_speed', 'shade_hit_radius',
    'night2_duration_s', 'night3_duration_s', 'dash_speed', 'dash_duration_s', 'dash_cooldown_s'];
  for (const k of nums) {
    if (typeof t[k] !== 'number' || !Number.isFinite(t[k] as number)) throw new Error(`tuning.${k} phải là số`);
  }
  if (typeof t.fall_enabled !== 'boolean') throw new Error('tuning.fall_enabled phải là boolean');
  const s = t.score as Record<string, unknown> | undefined;
  for (const k of ['per_mote', 'per_lantern', 'per_stun', 'per_second_left', 'per_flame_left']) {
    if (typeof s?.[k] !== 'number') throw new Error(`tuning.score.${k} phải là số`);
  }
  return t as unknown as Tuning;
}

/** Giây → tick (60 tick/giây). */
export const secToTicks = (s: number): number => Math.round(s * 60);
