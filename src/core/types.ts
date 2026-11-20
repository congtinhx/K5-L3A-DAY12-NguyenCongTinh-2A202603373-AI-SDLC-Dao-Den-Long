export interface ScoreTuning {
  per_mote: number; per_lantern: number; per_stun: number; per_second_left: number; per_flame_left: number;
  per_relight: number; per_stun_drain: number; per_lantern_at_dawn: number;
}
export interface Tuning {
  player_speed: number; carry_capacity: number; lantern_cost: number; lantern_count_night1: number;
  pickup_radius: number; interact_radius: number; pulse_cost: number; pulse_radius: number;
  night1_duration_s: number; night2_duration_s: number; night3_duration_s: number;
  flames: number; invuln_s: number; hit_drop_ratio: number;
  pulse_stun_s: number; pulse_push_m: number; pulse_cooldown_s: number; safe_radius: number;
  shade_speed: number; shade_hit_radius: number; fall_enabled: boolean;
  dash_speed: number; dash_duration_s: number; dash_cooldown_s: number;
  fuel_max: number; fuel_decay_per_s: number; fuel_per_mote: number; relight_cost: number; win_ratio: number;
  drain_per_s: number; low_fuel_threshold: number; capacity_max: number;
  score: ScoreTuning;
}
export type Vec3 = [number, number, number];
export interface InputState {
  move: [number, number]; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean; dash: boolean; pause: boolean;
}
export interface InputFrame {
  tick: number; move?: [number, number]; cam_yaw_deg?: number;
  jump?: boolean; interact?: boolean; pulse?: boolean; dash?: boolean; pause?: boolean;
}
export type ShadeState = 'spawning' | 'wander' | 'chase' | 'recoil' | 'stunned' | 'drain';
export type DrifterState = 'idle' | 'chase' | 'flee' | 'removed';
export interface ScenarioSpec {
  player?: { pos?: Vec3; carried?: number; flames?: number; invuln_ticks?: number; dash_cd_ticks?: number; pulse_cd_ticks?: number; charm_ticks?: number; successful_lights?: number };
  random_motes?: boolean;
  random_shades?: boolean;
  random_drifters?: boolean;
  wind_enabled?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3; state?: ShadeState; state_ticks_left?: number; target_lantern_id?: string }[];
  drifters?: { id?: string; pos: Vec3; state?: DrifterState; stolen?: number }[];
  charms?: { id?: string; pos?: Vec3; available?: boolean; respawn_ticks?: number }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean; fuel?: number; ever_lit?: boolean }[];
  time_left_s?: number;
}
export interface GameEvent { tick: number; name: string; data: Record<string, unknown> }
export type GameState = 'playing' | 'paused' | 'won' | 'lost';
