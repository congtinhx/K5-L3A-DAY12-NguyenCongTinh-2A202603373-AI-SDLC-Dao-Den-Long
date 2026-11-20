import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Rng } from '../../src/core/rng.ts';
import { InputTimeline } from '../../src/core/inputs.ts';
import { Sim, cmpId, emptyInput } from '../../src/core/sim.ts';
import { parseTuning } from '../../src/core/tuning.ts';
import { getMap, groundTop } from '../../src/core/map.ts';
import { FormatError, parseInputs } from '../../src/core/validate.ts';

const contract = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'game.contract.json'), 'utf8'));
const T = parseTuning(contract);

test('Rng: cùng seed cùng chuỗi, khác seed khác chuỗi, trong [0,1)', () => {
  const a = new Rng(5), b = new Rng(5), c = new Rng(6);
  const xa = Array.from({ length: 100 }, () => a.next());
  assert.deepEqual(xa, Array.from({ length: 100 }, () => b.next()));
  assert.notDeepEqual(xa, Array.from({ length: 100 }, () => c.next()));
  assert.ok(xa.every((x) => x >= 0 && x < 1));
});

test('InputTimeline: trường vắng giữ giá trị cũ, mặc định khi chưa có frame', () => {
  const tl = new InputTimeline([{ tick: 2, move: [1, 0], jump: true }, { tick: 5, jump: false }]);
  assert.deepEqual(tl.at(0), emptyInput());
  assert.deepEqual(tl.at(2).move, [1, 0]);
  assert.equal(tl.at(4).jump, true);
  assert.equal(tl.at(5).jump, false);
  assert.deepEqual(tl.at(5).move, [1, 0]);
});

test('parseInputs: lỗi định dạng ném FormatError', () => {
  assert.throws(() => parseInputs('{"frames":[{"tick":1},{"tick":1}]}'), FormatError);
  assert.throws(() => parseInputs('{"frames":[{"tick":0,"jump":"yes"}]}'), FormatError);
  assert.throws(() => parseInputs('[]'), FormatError);
});

test('cmpId so theo số: S2 < S10', () => {
  assert.ok(cmpId('S2', 'S10') < 0);
});

test('Tuning trong game.contract.json khớp số chuẩn Ticket-02 + Ticket-03', () => {
  assert.equal(contract.contract_version, '1.2');
  assert.deepEqual([T.player_speed, T.pickup_radius, T.interact_radius, T.pulse_cost, T.pulse_radius, T.pulse_cooldown_s, T.pulse_stun_s],
    [6, 1, 2, 3, 5, 3, 2]);
  assert.deepEqual([T.dash_speed, T.dash_duration_s, T.dash_cooldown_s, T.shade_speed, T.fall_enabled], [14, 0.2, 1.5, 4, true]);
  // Ticket-03 [THAY THẾ]: thời lượng 240/270/300, điểm mới, các khóa dầu
  assert.deepEqual([T.night1_duration_s, T.night2_duration_s, T.night3_duration_s], [240, 270, 300]);
  assert.deepEqual([T.fuel_max, T.fuel_decay_per_s, T.fuel_per_mote, T.relight_cost, T.win_ratio, T.drain_per_s, T.low_fuel_threshold, T.capacity_max], [100, 1, 10, 5, 0.6, 5, 30, 20]);
  assert.deepEqual([T.score.per_mote, T.score.per_lantern, T.score.per_relight, T.score.per_stun, T.score.per_stun_drain, T.score.per_lantern_at_dawn, T.score.per_second_left, T.score.per_flame_left], [5, 100, 40, 5, 15, 50, 0, 50]);
});

test('Bản đồ chuẩn: điểm sinh và đèn mỗi Đêm', () => {
  const m1 = getMap(1), m2 = getMap(2), m3 = getMap(3);
  assert.deepEqual([m1.moteSpawns.length, m1.shadeSpawns.length, m1.lanterns.length], [24, 12, 5]);
  assert.deepEqual([m2.moteSpawns.length, m2.shadeSpawns.length, m2.lanterns.length], [24, 16, 6]);
  assert.deepEqual([m3.moteSpawns.length, m3.shadeSpawns.length, m3.lanterns.length], [30, 16, 7]);
  // góc từ +X ngược kim đồng hồ: Đêm 1 Bóng Mực điểm đầu ở 15°
  assert.ok(Math.abs(m1.shadeSpawns[0][0] - 37 * Math.cos(Math.PI / 12)) < 1e-9 && m1.shadeSpawns[0][2] > 0);
  assert.equal(groundTop(m3, 0, 18), 3);
  assert.equal(groundTop(m3, 0, -18), 0);
  assert.equal(groundTop(m3, 0, 5), 6);
  assert.equal(groundTop(m2, 35, 0), 0);
  assert.equal(groundTop(m2, 35, 3), -Infinity);
});

test('Sim: 3 Đêm chạy được với seed, không lỗi, tất định', () => {
  for (const night of [1, 2, 3]) {
    const run = () => { const s = new Sim(T, 5, night); for (let i = 0; i < 3000 && s.state === 'playing'; i++) s.step(emptyInput()); return JSON.stringify(s.snapshot()); };
    assert.equal(run(), run());
  }
});
