import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addEntry, isoLocal, sortEntries, validateEntry, validateName } from '../../src/core/leaderboard.ts';
import type { LeaderboardEntry } from '../../src/core/leaderboard.ts';
import { Sim, emptyInput } from '../../src/core/sim.ts';
import { parseTuning } from '../../src/core/tuning.ts';

const T = parseTuning(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', '..', 'game.contract.json'), 'utf8')));
const E = (name: string, score: number, at: string): LeaderboardEntry => ({ name, score, nights_won: 1, achieved_at: at, seed: 1 });

test('Leaderboard: tên 3–12 ký tự [chữ số _], hỗ trợ tiếng Việt có dấu', () => {
  assert.equal(validateName('abc'), 'abc');
  assert.equal(validateName('A_b_1234567x'), 'A_b_1234567x');
  assert.equal(validateName('ab'), null);
  assert.equal(validateName('abcdefghijklm'), null);
  assert.equal(validateName('bad name'), null);
  assert.equal(validateName('x-y-z'), null);
  assert.equal(validateName('Mây_Đèn'), 'Mây_Đèn');
});

test('Leaderboard: điểm giảm dần, bằng điểm thì ai đạt trước đứng trên, giữ top 10', () => {
  const list: LeaderboardEntry[] = [];
  for (let i = 0; i < 12; i++) list.push(E(`p${String(i).padStart(2, '0')}`, i * 10, `2026-11-20T10:${String(i).padStart(2, '0')}:00+07:00`));
  const s = sortEntries(list);
  assert.equal(s.length, 10);
  assert.equal(s[0].score, 110);
  assert.equal(s[9].score, 20);
  const early = E('early', 50, '2026-11-20T09:00:00+07:00'), late = E('late', 50, '2026-11-20T11:00:00+07:00');
  const r = sortEntries([late, early]);
  assert.deepEqual(r.map((x) => x.name), ['early', 'late']);
  // so theo thời điểm thật, không theo chuỗi (múi giờ khác nhau)
  const utc = E('utc', 50, '2026-11-20T01:30:00Z'); // = 08:30+07:00, sớm hơn 'early'
  assert.equal(sortEntries([early, utc])[0].name, 'utc');
  assert.equal(addEntry(s, E('low', 0, '2026-11-20T12:00:00+07:00')).rank, 0);
});

test('Leaderboard: validateEntry và isoLocal có múi giờ', () => {
  assert.equal(validateEntry({ name: 'abc', score: 1.5, nights_won: 1, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 }), null);
  assert.equal(validateEntry({ name: 'abc', score: 1, nights_won: 4, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 }), null);
  assert.ok(validateEntry({ name: 'abc', score: 1, nights_won: 3, achieved_at: '2026-11-20T10:00:00+07:00', seed: 1 }));
  assert.match(isoLocal(new Date()), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$/);
});

test('Bench mode: không sinh thực thể, không sát thương, không nhặt, không hao dầu, không kết thúc', () => {
  const sim = new Sim(T, 42, 1, { random_motes: false, random_shades: false, random_drifters: false, time_left_s: 1,
    motes: [[0, 0, 0.3]], shades: [{ pos: [0.5, 1, 0] }], lanterns: [{ id: 'L1', lit: true }] });
  sim.bench = true;
  for (let i = 0; i < 1200; i++) assert.deepEqual(sim.step(emptyInput()).filter((e) => e.name !== 'pulse'), []);
  assert.equal(sim.state, 'playing');
  assert.equal(sim.player.flames, 3);
  assert.equal(sim.motes.length, 1);
  assert.equal(sim.shades.length, 1);
  assert.equal(sim.lanterns[0].fuelT, 6000);
});
