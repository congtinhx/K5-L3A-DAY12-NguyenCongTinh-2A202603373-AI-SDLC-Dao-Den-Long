import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Rng } from '../../src/core/rng.ts';
import { InputTimeline } from '../../src/core/inputs.ts';
import { Sim, cmpId, emptyInput } from '../../src/core/sim.ts';
import { parseTuning } from '../../src/core/tuning.ts';
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

test('Tuning đọc từ game.contract.json khớp số trong assumptions', () => {
  assert.equal(T.player_speed, 6);
  assert.equal(T.lantern_count_night1, 5);
  assert.equal(T.fall_enabled, false);
});

test('Sim: game mặc định không bao giờ có player_hit by fall (fall_enabled=false)', () => {
  const sim = new Sim(T, 9);
  const inp = { ...emptyInput(), move: [0, 1] as [number, number] };
  for (let i = 0; i < 2000 && sim.state === 'playing'; i++) {
    for (const e of sim.step(inp)) assert.notEqual((e.data as { by?: string }).by, 'fall');
  }
  assert.ok(Math.hypot(sim.player.x, sim.player.z) <= 40 + 1e-9);
});
