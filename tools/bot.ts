// Bot tự chơi Đêm 1 (dùng core thật) → sinh file inputs theo contract. Dùng làm bằng chứng game thắng được.
// node tools/bot.ts --seed 42 --out tests/fixtures/bot-win-seed42.inputs.json
import fs from 'node:fs';
import path from 'node:path';
import { Sim, emptyInput } from '../src/core/sim.ts';
import { parseTuning } from '../src/core/tuning.ts';
import type { InputFrame } from '../src/core/types.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('seed', '42'));
const T = parseTuning(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'game.contract.json'), 'utf8')));
const sim = new Sim(T, seed);
const frames: InputFrame[] = [];
let last = JSON.stringify(emptyInput());
for (let k = 0; k < 18000 && sim.state === 'playing'; k++) {
  const p = sim.player, inp = emptyInput();
  const unlit = sim.lanterns.filter((l) => !l.lit);
  const need = Math.min(T.carry_capacity, Math.min(...unlit.map((l) => T.lantern_cost - l.deposited)) + T.pulse_cost);
  const near = <U extends { x: number; z: number }>(xs: U[]) => xs.reduce((b, o) => (Math.hypot(o.x - p.x, o.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? o : b));
  let tx: number, tz: number;
  if (p.carried >= need || (sim.motes.length === 0 && p.carried > 0)) {
    const l = near(unlit); tx = l.x; tz = l.z;
    if (Math.hypot(l.x - p.x, l.z - p.z) <= T.interact_radius - 0.2) inp.interact = k % 2 === 0;
  } else if (sim.motes.length) { const m = near(sim.motes); tx = m.x; tz = m.z; } else { tx = p.x; tz = p.z; }
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d > 0.05) inp.move = [dx / d, dz / d];
  const threat = sim.shades.some((s) => !sim.isStunned(s) && Math.hypot(s.x - p.x, s.z - p.z) < 3);
  if (threat && p.carried >= T.pulse_cost) inp.pulse = k % 2 === 0;
  const cur = JSON.stringify(inp);
  if (cur !== last) { frames.push({ tick: k, ...inp }); last = cur; }
  sim.step(inp);
}
fs.writeFileSync(arg('out', 'out/bot.inputs.json'), JSON.stringify({ frames }) + '\n');
console.log(`seed ${seed}: ${sim.state} ${sim.result?.reason ?? ''} tick ${sim.tick} score ${sim.score} flames ${sim.player.flames} frames ${frames.length}`);
