// Bot tự chơi Đêm 1 (dùng core thật) → sinh file inputs theo contract. Dùng làm bằng chứng game thắng được.
// node tools/bot.ts --seed 42 --out tests/fixtures/bot-seed5-n1.inputs.json
import fs from 'node:fs';
import path from 'node:path';
import { Sim, emptyInput } from '../src/core/sim.ts';
import { parseTuning } from '../src/core/tuning.ts';
import type { InputFrame } from '../src/core/types.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('seed', '42'));
const night = Number(arg('night', '1'));
const T = parseTuning(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'game.contract.json'), 'utf8')));
const sim = new Sim(T, seed, night);
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
  const danger = sim.shades.filter((s) => (s.state === 'chase' || s.state === 'wander') && Math.hypot(s.x - p.x, s.z - p.z) < 4.2);
  if (danger.length && p.carried >= T.pulse_cost && p.pulseCd === 0) inp.pulse = k % 2 === 0;
  else if (danger.length) {
    // né: chạy ngược hướng Bóng Mực gần nhất, lướt nếu được
    const s = danger[0], ax = p.x - s.x, az = p.z - s.z, a = Math.hypot(ax, az) || 1;
    let ex = ax / a, ez = az / a;
    if (Math.hypot(p.x + ex * 3, p.z + ez * 3) > 36) { const t = ex; ex = -ez; ez = t; } // đừng chạy ra biển mây
    inp.move = [ex, ez];
    inp.dash = k % 2 === 0;
  }
  const cur = JSON.stringify(inp);
  if (cur !== last) { frames.push({ tick: k, ...inp }); last = cur; }
  sim.step(inp);
}
fs.writeFileSync(arg('out', 'out/bot.inputs.json'), JSON.stringify({ frames }) + '\n');
console.log(`night ${night} seed ${seed}: ${sim.state} ${sim.result?.reason ?? ''} tick ${sim.tick} score ${sim.score} flames ${sim.player.flames} frames ${frames.length}`);
