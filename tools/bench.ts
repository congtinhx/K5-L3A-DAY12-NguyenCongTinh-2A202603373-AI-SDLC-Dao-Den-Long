// bench_cmd: node tools/bench.ts --seed 42 --duration 30 --out bench.json
// Mở Chrome/Chromium/Edge cửa sổ 1280×720 (không toàn màn hình, tắt vsync bằng cờ), chạy cảnh benchmark chuẩn trong trang,
// nhận kết quả qua HTTP, đo RSS cao nhất của các tiến trình trình duyệt, ghi bench.json rồi thoát mã 0.
import { spawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createServer } from './server.ts';

const T0 = Date.now(); // lúc tiến trình bắt đầu (load_ms tính từ đây)
const arg = (k: string, d: string) => { const i = process.argv.indexOf(`--${k}`); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const seed = Number(arg('seed', '42')), duration = Number(arg('duration', '30')), out = arg('out', 'bench.json');

function findBrowser(): string | null {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const cands = process.platform === 'darwin'
    ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : process.platform === 'win32'
      ? [`${process.env['PROGRAMFILES']}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`, `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`]
      : [];
  for (const c of cands) if (c && fs.existsSync(c)) return c;
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try { const p = execSync(`command -v ${n}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); if (p) return p; } catch { /* không có */ }
  }
  return null;
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ddl-bench-'));
function browserRssMb(): number | null {
  if (process.platform === 'win32') return null;
  try {
    const lines = execSync('ps -A -o rss=,args=', { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 24 }).toString().split('\n');
    const kb = lines.filter((l) => l.includes(profile)).reduce((s, l) => s + (parseInt(l.trim(), 10) || 0), 0);
    return kb ? Math.round(kb / 1024) : null;
  } catch { return null; }
}

const browser = findBrowser();
if (!browser) { console.error('Không tìm thấy Chrome/Chromium/Edge. Đặt CHROME_PATH=/đường/dẫn/trình-duyệt rồi chạy lại.'); process.exit(1); }
let peak: number | null = null, sampler: ReturnType<typeof setInterval> | null = null, child: ReturnType<typeof spawn> | null = null;
const finish = (code: number) => { if (sampler) clearInterval(sampler); try { child?.kill(); } catch { /* */ } server.close(); setTimeout(() => { try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* */ } process.exit(code); }, 500); };
const server = createServer({
  onBenchStart: () => { sampler = setInterval(() => { const m = browserRssMb(); if (m !== null) peak = Math.max(peak ?? 0, m); }, 250); },
  onBench: (r) => {
    const result = {
      contract_version: '1.3',
      avg_fps: r.avg_fps, p1_low_fps: r.p1_low_fps, frame_ms_p95: r.frame_ms_p95, frames: r.frames,
      load_ms: typeof r.first_frame_epoch_ms === 'number' ? Math.round(r.first_frame_epoch_ms - T0) : null,
      peak_mem_mb: peak,
      vsync_off: true,
      renderer: `three.js r170 WebGLRenderer trong ${path.basename(browser)} — ${r.gl_renderer ?? '?'}; viewport ${r.viewport ?? '?'}`,
      os: `${os.type()} ${os.release()} ${os.arch()} · ${os.cpus()[0]?.model ?? '?'} · RAM ${Math.round(os.totalmem() / 1073741824)} GB`,
      seed, duration_s: duration,
      note: peak === null ? 'peak_mem_mb = null: không đọc được RSS của tiến trình trình duyệt trên hệ điều hành này' : 'peak_mem_mb = tổng RSS các tiến trình trình duyệt của phiên bench (ps)',
    };
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
    finish(0);
  },
});
server.listen(0, '127.0.0.1', () => {
  const port = (server.address() as AddressInfo).port;
  const url = `http://127.0.0.1:${port}/?bench=1&seed=${seed}&duration=${duration}`;
  child = spawn(browser, [
    `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--window-size=1280,720', '--window-position=0,0', `--app=${url}`,
    '--disable-gpu-vsync', '--disable-frame-rate-limit', // tắt vsync
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  ], { stdio: 'ignore' });
  child.on('exit', () => { if (!fs.existsSync(out)) { console.error('Trình duyệt đóng trước khi có kết quả'); finish(1); } });
});
setTimeout(() => { console.error(`Hết thời gian chờ (${duration + 90} s) mà chưa có kết quả bench`); finish(1); }, (duration + 90) * 1000);
