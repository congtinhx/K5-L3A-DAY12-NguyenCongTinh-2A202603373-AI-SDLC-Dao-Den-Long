import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const CLI = path.join(ROOT, 'src', 'headless', 'cli.ts');

export interface CliCase {
  name: string; seed: number; ticks: number; snapshot_every?: number;
  scenario?: unknown; inputs?: unknown; scenario_raw?: string; inputs_raw?: string;
}

export function runCli(c: CliCase): { code: number; out: string; stderr: string } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-'));
  const out = path.join(tmp, 'out.jsonl');
  const args = [CLI, '--seed', String(c.seed), '--night', '1', '--ticks', String(c.ticks), '--out', out];
  if (c.snapshot_every) args.push('--snapshot-every', String(c.snapshot_every));
  const sc = c.scenario_raw ?? (c.scenario ? JSON.stringify(c.scenario) : null);
  if (sc !== null) { fs.writeFileSync(path.join(tmp, 'scenario.json'), sc); args.push('--scenario', path.join(tmp, 'scenario.json')); }
  const inp = c.inputs_raw ?? (c.inputs ? JSON.stringify(c.inputs) : null);
  if (inp !== null) { fs.writeFileSync(path.join(tmp, 'inputs.json'), inp); args.push('--inputs', path.join(tmp, 'inputs.json')); }
  const r = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const text = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  fs.rmSync(tmp, { recursive: true, force: true });
  return { code: r.status ?? -1, out: text, stderr: r.stderr };
}

export function parseJsonl(text: string): any[] {
  return text.split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l));
}

export function getPath(obj: any, p: string): any {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** So sánh sâu, số sai lệch ≤ 1e-3. subset=true: chỉ kiểm các khóa có trong expected. */
export function approxEqual(actual: any, expected: any, subset: boolean): boolean {
  if (typeof expected === 'number') return typeof actual === 'number' && Math.abs(actual - expected) <= 1e-3;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => approxEqual(actual[i], e, subset));
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object') return false;
    const keys = Object.keys(expected);
    if (!subset && Object.keys(actual).length !== keys.length) return false;
    return keys.every((k) => approxEqual(actual[k], expected[k], subset));
  }
  return actual === expected;
}
