// npm run verify (PHASE=phase-1 mặc định): test + tất định + schema + bot thắng + đo tốc độ → docs/proof/<PHASE>/verify-report.md
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PHASE = process.env.PHASE ?? 'phase-1';
const OUT = path.join(ROOT, 'docs', 'proof', PHASE);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-verify-'));
fs.mkdirSync(OUT, { recursive: true });
const rows: string[] = [];
let ok = true;
const check = (name: string, pass: boolean, detail: string) => { ok &&= pass; rows.push(`| ${name} | ${pass ? 'ĐẠT' : '**KHÔNG ĐẠT**'} | ${detail} |`); };
const node = (args: string[]) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' });
const cli = (args: string[], out: string) => node(['src/headless/cli.ts', '--night', '1', ...args, '--out', out]);
const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const lines = (f: string) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

// 1. Bộ test
const t = node(['--test', 'tests/**/*.test.ts']);
const pass = /# pass (\d+)/.exec(t.stdout)?.[1], fail = /# fail (\d+)/.exec(t.stdout)?.[1];
fs.writeFileSync(path.join(OUT, 'test-output.txt'), t.stdout.replace(/duration_ms [\d.]+/g, 'duration_ms …'));
check('npm test (unit + 32 scenario qua CLI)', t.status === 0, `pass ${pass}, fail ${fail} — xem test-output.txt`);

// 2. Tất định: seed 42 hai lần giống từng byte; seed 43 khác
const inputs = path.join(ROOT, 'tests', 'fixtures', 'bot-win-seed42.inputs.json');
const a = path.join(TMP, 'a.jsonl'), b = path.join(TMP, 'b.jsonl'), c = path.join(TMP, 'c.jsonl');
cli(['--seed', '42', '--ticks', '18000', '--inputs', inputs], a);
cli(['--seed', '42', '--ticks', '18000', '--inputs', inputs], b);
cli(['--seed', '43', '--ticks', '3000'], c);
const same = fs.readFileSync(a).equals(fs.readFileSync(b));
check('Tất định (seed 42 chạy 2 lần)', same, `sha256 ${sha(a)} = ${sha(b)}`);
const c2 = path.join(TMP, 'c2.jsonl');
cli(['--seed', '42', '--ticks', '3000'], c2);
check('Khác seed → khác output', !fs.readFileSync(c).equals(fs.readFileSync(c2)), `seed 43 ${sha(c)} ≠ seed 42 ${sha(c2)}`);

// 3. Bot thắng Đêm 1 từ đầu (inputs sinh bởi tools/bot.ts, phát lại qua CLI)
const L = lines(a), end = L[L.length - 1];
const lit = L.filter((x) => x.name === 'lantern_lit').length;
check('Chơi từ đầu tới thắng (bot, seed 42)', end.type === 'end' && end.state === 'won' && lit === 5, `end ${JSON.stringify(end)}, lantern_lit ×${lit}`);

// 4. Schema JSONL
const snaps = L.filter((x) => x.type === 'snapshot');
const schemaOk = L[0].type === 'snapshot' && L[0].tick === 0 && snaps.every((s, i) => s.tick === i * 10 && s.sim_tick === s.tick && ['playing', 'won', 'lost'].includes(s.state)
  && Array.isArray(s.player.pos) && s.player.pos.length === 3 && s.lanterns.length === 5 && typeof s.motes_active === 'number'
  && s.shades.every((sh: { state: string }) => ['chase', 'stunned'].includes(sh.state))) && L.filter((x) => x.type === 'end').length === 1;
check('Schema JSONL (snapshot 0,10,20…; end duy nhất ở cuối)', schemaOk, `${snaps.length} snapshot, ${L.filter((x) => x.type === 'event').length} event`);

// 5. Mã thoát lỗi
fs.writeFileSync(path.join(TMP, 'bad.json'), '{oops');
const bad = cli(['--seed', '1', '--ticks', '10', '--inputs', path.join(TMP, 'bad.json')], path.join(TMP, 'x.jsonl'));
check('File inputs hỏng → mã 2', bad.status === 2, `exit ${bad.status}, stderr: ${bad.stderr.trim()}`);

// 6. Tốc độ: 18000 tick (cả Đêm 1) không giao diện
const t0 = performance.now();
cli(['--seed', '1', '--ticks', '18000', '--snapshot-every', '18000'], path.join(TMP, 'p.jsonl'));
const ms = performance.now() - t0;
check('Tốc độ headless 18000 tick', ms < 10000, `${ms.toFixed(0)} ms (gồm khởi động Node) — ${os.cpus()[0]?.model ?? '?'}, ${os.platform()} ${os.arch()}, Node ${process.versions.node}`);

const report = `# Verify report — ${PHASE}

Sinh tự động bởi \`npm run verify\` (tools/verify.ts). Không sửa tay. Chạy lại ở tag tương ứng sẽ ra cùng kết quả (trừ số ms).

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
${rows.join('\n')}

Dòng end của ván bot (seed 42): \`${JSON.stringify(end)}\`
`;
fs.writeFileSync(path.join(OUT, 'verify-report.md'), report);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(report);
process.exit(ok ? 0 : 1);
