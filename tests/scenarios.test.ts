// Chạy mọi tests/scenarios/*.json qua headless CLI thật (đúng như máy chấm) và so với kỳ vọng tính tay.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runCli, parseJsonl, getPath, approxEqual } from './helpers.ts';

const dir = path.join(import.meta.dirname, 'scenarios');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const c = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  test(`${c.name} — ${c.req}`, () => {
    const r = runCli(c);
    const ex = c.expect;
    assert.equal(r.code, ex.exit_code ?? 0, `exit code (stderr: ${r.stderr})`);
    if ((ex.exit_code ?? 0) !== 0) return;
    const lines = parseJsonl(r.out);
    const last = lines[lines.length - 1];
    assert.equal(last.type, 'end', 'dòng cuối phải là end');
    const events = lines.filter((l) => l.type === 'event');
    const snaps = new Map(lines.filter((l) => l.type === 'snapshot').map((s) => [s.tick, s]));
    for (const e of ex.events ?? []) {
      const found = events.some((g) => g.tick === e.tick && g.name === e.name && (!e.data || approxEqual(g.data, e.data, true)));
      assert.ok(found, `thiếu event ${JSON.stringify(e)}; có: ${JSON.stringify(events.filter((g) => g.name === e.name))}`);
    }
    for (const [name, n] of Object.entries(ex.event_count ?? {})) {
      assert.equal(events.filter((g) => g.name === name).length, n, `số event ${name}`);
    }
    for (const name of ex.absent ?? []) {
      assert.equal(events.filter((g) => g.name === name).length, 0, `không được có event ${name}`);
    }
    if (ex.end) assert.ok(approxEqual(last, ex.end, true), `end ${JSON.stringify(last)} != ${JSON.stringify(ex.end)}`);
    if (ex.snapshot_ticks) assert.deepEqual([...snaps.keys()], ex.snapshot_ticks);
    for (const s of ex.snapshots ?? []) {
      const snap = snaps.get(s.tick);
      assert.ok(snap, `không có snapshot tick ${s.tick}`);
      const v = getPath(snap, s.path);
      const shown = `tick ${s.tick} ${s.path} = ${JSON.stringify(v)}`;
      if ('gt' in s) assert.ok(v > s.gt, `${shown}, mong đợi > ${s.gt}`);
      if ('lt' in s) assert.ok(v < s.lt, `${shown}, mong đợi < ${s.lt}`);
      if ('norm' in s) assert.ok(Math.abs(Math.hypot(...v) - s.norm) <= 1e-3, `${shown}, mong đợi độ dài ${s.norm}`);
      if ('value' in s) assert.ok(approxEqual(v, s.value, false), `${shown}, mong đợi ${JSON.stringify(s.value)}`);
    }
  });
}
