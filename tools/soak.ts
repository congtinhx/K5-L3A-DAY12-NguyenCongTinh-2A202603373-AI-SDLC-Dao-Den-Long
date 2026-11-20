// Soak test (Ticket-04 §2): node --expose-gc --no-opt --no-maglev tools/soak.ts --seed 7 --nights 10 --out soak.json
// Cờ --no-opt --no-maglev: tắt tầng JIT tối ưu để RSS phản ánh bộ nhớ của game (heap ổn định ~8 MB) thay vì kho code tối ưu của V8 — xem docs/proof/phase-4/README.md.
// 10 Đêm liên tiếp trong cùng một tiến trình (1 → 2 → 3 xoay vòng), Đêm thứ i dùng seed + i; input ngẫu nhiên theo seed.
import fs from 'node:fs';
import path from 'node:path';
import { Sim, emptyInput } from '../src/core/sim.ts';
import { Rng } from '../src/core/rng.ts';
import { parseTuning } from '../src/core/tuning.ts';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('seed', '7')), nights = Number(arg('nights', '10')), out = arg('out', 'soak.json');
if (!Number.isInteger(seed) || !Number.isInteger(nights) || nights < 1) { console.error('tham số không hợp lệ'); process.exit(1); }
const T = parseTuning(JSON.parse(fs.readFileSync(path.join(import.meta.dirname, '..', 'game.contract.json'), 'utf8')));
const gc = (globalThis as { gc?: () => void }).gc;
const rssMb = () => { gc?.(); return Math.round((process.memoryUsage().rss / 1048576) * 10) / 10; };
const heapMb = () => Math.round((process.memoryUsage().heapUsed / 1048576) * 10) / 10;
let heapStart = 0;

const t0 = performance.now();
const results: string[] = [];
let crashes = 0, memStart = 0, totalTicks = 0;
for (let i = 1; i <= nights; i++) {
  const night = ((i - 1) % 3) + 1, s = seed + i;
  try {
    let sim: Sim | null = new Sim(T, s, night);
    if (i === 1) { memStart = rssMb(); heapStart = heapMb(); } // sau khi tải xong Đêm đầu tiên
    const rng = new Rng(s);
    const maxTicks = Math.round(sim.initialTime * 60);
    const inp = emptyInput();
    for (let k = 0; k < maxTicks && (sim.state === 'playing' || sim.state === 'paused'); k++) {
      if (k % 30 === 0) { const a = rng.next() * 2 * Math.PI; inp.move = [Math.cos(a), Math.sin(a)]; }
      inp.jump = rng.next() < 0.05; inp.dash = rng.next() < 0.03; inp.pulse = rng.next() < 0.02; inp.interact = rng.next() < 0.10;
      sim.step(inp);
      totalTicks++;
    }
    results.push(sim.state === 'won' ? 'won' : 'lost');
    sim = null; // reset Đêm
  } catch (e) {
    crashes++; results.push('crash');
    console.error(`Đêm thứ ${i} (night ${night}, seed ${s}) lỗi:`, e);
  }
}
const memEnd = rssMb(); // sau khi reset xong Đêm cuối
const heapEnd = heapMb();
const report = { nights, crashes, results, mem_start_mb: memStart, mem_end_mb: memEnd, duration_s: Math.round((performance.now() - t0) / 100) / 10, ticks: totalTicks, gc_exposed: !!gc,
  heap_start_mb: heapStart, heap_end_mb: heapEnd, node: process.version, v8_flags: process.execArgv.join(' ') };
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
process.exit(crashes === 0 && memEnd <= 1.2 * memStart ? 0 : 1);
