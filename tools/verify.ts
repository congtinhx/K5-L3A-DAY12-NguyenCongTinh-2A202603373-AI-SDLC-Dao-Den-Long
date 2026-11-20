// npm run verify (PHASE=phase-2 mặc định): test + tất định 3 Đêm + schema v1.1 + bot + tốc độ 21 600 tick → docs/proof/<PHASE>/verify-report.md
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const PHASE = process.env.PHASE ?? 'phase-2';
const OUT = path.join(ROOT, 'docs', 'proof', PHASE);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-verify-'));
fs.mkdirSync(OUT, { recursive: true });
const rows: string[] = [];
let ok = true;
const check = (name: string, pass: boolean, detail: string) => { ok &&= pass; rows.push(`| ${name} | ${pass ? 'ĐẠT' : '**KHÔNG ĐẠT**'} | ${detail} |`); };
const node = (args: string[]) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' } });
const cli = (night: number, args: string[], out: string) => node(['src/headless/cli.ts', '--night', String(night), ...args, '--out', out]);
const sha = (f: string) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 16);
const lines = (f: string) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));

// 1. Bộ test
const t = node(['--test', 'tests/**/*.test.ts']);
const pass = /# pass (\d+)/.exec(t.stdout)?.[1], fail = /# fail (\d+)/.exec(t.stdout)?.[1];
fs.writeFileSync(path.join(OUT, 'test-output.txt'), t.stdout.replace(/duration_ms [\d.]+/g, 'duration_ms …'));
check('npm test (unit + scenario headless qua CLI)', t.status === 0, `pass ${pass}, fail ${fail} — xem test-output.txt`);

for (const night of [1, 2, 3]) {
  // 2. Tất định + 3. tốc độ một Đêm đầy đủ (21 600 tick)
  const a = path.join(TMP, `a${night}.jsonl`), b = path.join(TMP, `b${night}.jsonl`), c = path.join(TMP, `c${night}.jsonl`);
  cli(night, ['--seed', '42', '--ticks', '21600'], a);
  cli(night, ['--seed', '42', '--ticks', '21600'], b);
  // tốc độ: Đêm đầy đủ 21 600 tick (không Bóng Mực để Mây sống hết đêm, thời lượng 360 s)
  const full = path.join(TMP, `full${night}.json`), fo = path.join(TMP, `f${night}.jsonl`);
  fs.writeFileSync(full, JSON.stringify({ random_shades: false, shades: [], time_left_s: 360 }));
  const t0 = performance.now();
  cli(night, ['--seed', '42', '--ticks', '21600', '--scenario', full], fo);
  const ms = performance.now() - t0;
  const fEnd = lines(fo).at(-1);
  cli(night, ['--seed', '43', '--ticks', '21600'], c);
  check(`Đêm ${night}: tất định (seed 42 × 2)`, fs.readFileSync(a).equals(fs.readFileSync(b)), `sha256 ${sha(a)} = ${sha(b)}`);
  check(`Đêm ${night}: khác seed → khác output`, !fs.readFileSync(a).equals(fs.readFileSync(c)), `seed 43 ${sha(c)}`);
  check(`Đêm ${night}: tốc độ ≤ 30 s cho 21 600 tick`, ms <= 30000 && fEnd.ticks === 21600, `${ms.toFixed(0)} ms gồm khởi động Node; end ${JSON.stringify(fEnd)}`);
  // 4. Schema v1.1
  const L = lines(a), snaps = L.filter((x) => x.type === 'snapshot');
  const SH = ['spawning', 'wander', 'chase', 'recoil', 'stunned'], DR = ['idle', 'chase', 'flee', 'removed'];
  const bad: string[] = [];
  if (!(L[0].type === 'snapshot' && L[0].tick === 0)) bad.push('dòng đầu không phải snapshot tick 0');
  if (!(L[1].type === 'event' && L[1].name === 'night_start' && L[1].data.night === night)) bad.push('thiếu night_start');
  if (L.filter((x) => x.type === 'end').length !== 1 || L[L.length - 1].type !== 'end') bad.push('end không duy nhất/không ở cuối');
  for (const s of snaps) {
    const p = s.player;
    if (s.night !== night || typeof s.wind?.active !== 'boolean' || typeof s.wind?.dir_deg !== 'number') bad.push(`tick ${s.tick}: night/wind`);
    for (const k of ['pos', 'vel']) if (!Array.isArray(p[k]) || p[k].length !== 3) bad.push(`tick ${s.tick}: player.${k}`);
    for (const k of ['grounded', 'invuln']) if (typeof p[k] !== 'boolean') bad.push(`tick ${s.tick}: player.${k}`);
    for (const k of ['dash_cd_s', 'pulse_cd_s', 'charm_s', 'flames', 'carried']) if (typeof p[k] !== 'number') bad.push(`tick ${s.tick}: player.${k}`);
    if (!s.shades.every((x: { state: string }) => SH.includes(x.state))) bad.push(`tick ${s.tick}: tên trạng thái Bóng Mực`);
    if (!s.drifters.every((x: { state: string; stolen: number }) => DR.includes(x.state) && typeof x.stolen === 'number')) bad.push(`tick ${s.tick}: drifters`);
    if (!s.motes.every((m: { kind: string; ttl_s: unknown }) => ['random', 'dropped'].includes(m.kind) && (m.kind === 'random' ? m.ttl_s === null : typeof m.ttl_s === 'number'))) bad.push(`tick ${s.tick}: motes`);
    if (!s.charms.every((c: { available: unknown; respawn_s: unknown }) => typeof c.available === 'boolean' && typeof c.respawn_s === 'number')) bad.push(`tick ${s.tick}: charms`);
  }
  check(`Đêm ${night}: schema JSONL v1.1`, bad.length === 0, bad.length ? bad.slice(0, 3).join('; ') : `${snaps.length} snapshot, ${L.filter((x) => x.type === 'event').length} event, kết thúc ${JSON.stringify(L[L.length - 1])}`);
}

// 5. Bot tự chơi (inputs sinh bởi tools/bot.ts) phát lại qua CLI — chứng minh chơi trọn Đêm 1 không lỗi
const bo = path.join(TMP, 'bot.jsonl');
const br = cli(1, ['--seed', '5', '--ticks', '21600', '--inputs', path.join(ROOT, 'tests', 'fixtures', 'bot-seed5-n1.inputs.json')], bo);
const BL = lines(bo), bend = BL[BL.length - 1];
check('Bot tự chơi Đêm 1 (seed 5) tới hết Đêm, phát lại qua CLI', br.status === 0 && bend.type === 'end' && bend.state !== 'playing',
  `end ${JSON.stringify(bend)}; đèn thắp ×${BL.filter((x) => x.name === 'lantern_lit').length}. Bot đơn giản **chưa thắng** với số chuẩn (xem eval-phase2.md)`);

// 6. Mã thoát lỗi
fs.writeFileSync(path.join(TMP, 'bad.json'), '{oops');
const bad = cli(1, ['--seed', '1', '--ticks', '10', '--inputs', path.join(TMP, 'bad.json')], path.join(TMP, 'x.jsonl'));
check('File inputs hỏng → mã 2', bad.status === 2, `exit ${bad.status}`);
const n4 = cli(4, ['--seed', '1', '--ticks', '10'], path.join(TMP, 'y.jsonl'));
check('--night 4 → lỗi (mã ≠ 0)', n4.status !== 0, `exit ${n4.status}`);

const report = `# Verify report — ${PHASE}

Sinh tự động bởi \`npm run verify\` (tools/verify.ts). Không sửa tay. Chạy lại ở tag tương ứng sẽ ra cùng kết quả (trừ số ms).
Máy: ${os.cpus()[0]?.model ?? '?'}, ${os.platform()} ${os.arch()}, Node ${process.versions.node}.

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
${rows.join('\n')}
`;
fs.writeFileSync(path.join(OUT, 'verify-report.md'), report);
fs.rmSync(TMP, { recursive: true, force: true });
console.log(report);
process.exit(ok ? 0 : 1);
