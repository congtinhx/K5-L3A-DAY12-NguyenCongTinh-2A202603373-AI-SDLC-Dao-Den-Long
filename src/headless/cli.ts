#!/usr/bin/env node
// Headless theo Test Contract v1.1:
// <cmd> --seed <int> --night 1 [--scenario f] [--inputs f] --ticks <int> --out <file.jsonl> [--snapshot-every <int>]
import fs from 'node:fs';
import path from 'node:path';
import { Sim } from '../core/sim.ts';
import { InputTimeline } from '../core/inputs.ts';
import { getMap } from '../core/map.ts';
import { parseTuning } from '../core/tuning.ts';
import { FormatError, parseInputs, parseScenario } from '../core/validate.ts';

class UsageError extends Error {}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) throw new UsageError(`tham số không hợp lệ: ${a}`);
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new UsageError(`thiếu giá trị cho ${a}`);
    out[a.slice(2)] = v; i++;
  }
  return out;
}
function intArg(a: Record<string, string>, k: string, min: number, def?: number): number {
  if (a[k] === undefined) { if (def !== undefined) return def; throw new UsageError(`thiếu --${k}`); }
  const n = Number(a[k]);
  if (!Number.isInteger(n) || n < min) throw new UsageError(`--${k} phải là số nguyên ≥ ${min}`);
  return n;
}
function readFile(p: string, what: string): string {
  try { return fs.readFileSync(p, 'utf8'); } catch (e) { throw new FormatError(`không đọc được file ${what} ${p}: ${(e as Error).message}`); }
}

function main(): void {
  const a = parseArgs(process.argv.slice(2));
  const seed = intArg(a, 'seed', Number.MIN_SAFE_INTEGER);
  const night = intArg(a, 'night', 1);
  if (night > 3) throw new UsageError(`--night phải là 1, 2 hoặc 3`);
  const ticks = intArg(a, 'ticks', 0);
  const every = intArg(a, 'snapshot-every', 1, 10);
  if (!a.out) throw new UsageError('thiếu --out');
  for (const k of Object.keys(a)) {
    if (!['seed', 'night', 'ticks', 'snapshot-every', 'out', 'scenario', 'inputs'].includes(k)) process.stderr.write(`cảnh báo: bỏ qua tham số --${k}\n`);
  }

  const contractPath = path.join(import.meta.dirname, '..', '..', 'game.contract.json');
  const tuning = parseTuning(JSON.parse(fs.readFileSync(contractPath, 'utf8')));
  const lanternIds = getMap(night).lanterns.map((_, i) => `L${i + 1}`);
  const scenario = a.scenario ? parseScenario(readFile(a.scenario, 'scenario'), lanternIds) : null;
  const frames = a.inputs ? parseInputs(readFile(a.inputs, 'inputs')) : [];

  const sim = new Sim(tuning, seed, night, scenario);
  const timeline = new InputTimeline(frames);
  const lines: string[] = [JSON.stringify(sim.snapshot()), JSON.stringify({ type: 'event', tick: 0, name: 'night_start', data: { night } })];
  for (let k = 0; k < ticks && (sim.state === 'playing' || sim.state === 'paused'); k++) {
    for (const e of sim.step(timeline.at(k))) lines.push(JSON.stringify({ type: 'event', tick: e.tick, name: e.name, data: e.data }));
    if (sim.tick % every === 0) lines.push(JSON.stringify(sim.snapshot()));
  }
  lines.push(JSON.stringify({ type: 'end', ticks: sim.tick, state: sim.state, score: sim.score }));
  fs.mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
  fs.writeFileSync(a.out, lines.join('\n') + '\n');
}

try {
  main();
  process.exitCode = 0;
} catch (e) {
  process.stderr.write(`lỗi: ${(e as Error).message}\n`);
  process.exitCode = e instanceof FormatError ? 2 : 1;
}
