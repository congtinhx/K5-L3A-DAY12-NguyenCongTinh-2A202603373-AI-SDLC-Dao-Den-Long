export interface ScoreTuning {
  per_mote: number; per_lantern: number; per_stun: number; per_second_left: number; per_flame_left: number;
}
export interface Tuning {
  player_speed: number; carry_capacity: number; lantern_cost: number; lantern_count_night1: number;
  pickup_radius: number; interact_radius: number; pulse_cost: number; pulse_radius: number;
  night1_duration_s: number; flames: number; invuln_s: number; hit_drop_ratio: number;
  pulse_stun_s: number; pulse_push_m: number; pulse_cooldown_s: number; safe_radius: number;
  shade_speed: number; shade_hit_radius: number; fall_enabled: boolean; score: ScoreTuning;
}
export type Vec3 = [number, number, number];
export interface InputState {
  move: [number, number]; cam_yaw_deg: number; jump: boolean; interact: boolean; pulse: boolean; dash: boolean;
}
export interface InputFrame {
  tick: number; move?: [number, number]; cam_yaw_deg?: number; jump?: boolean; interact?: boolean; pulse?: boolean; dash?: boolean;
}
export interface ScenarioSpec {
  player?: { pos?: Vec3; carried?: number; flames?: number };
  random_motes?: boolean;
  random_shades?: boolean;
  motes?: Vec3[];
  shades?: { id?: string; pos: Vec3 }[];
  lanterns?: { id: string; pos?: Vec3; deposited?: number; lit?: boolean }[];
  time_left_s?: number;
}
export interface GameEvent { tick: number; name: string; data: Record<string, unknown> }
export type GameState = 'playing' | 'won' | 'lost';
