// Server không dependency: phục vụ game (web/ + src/**/*.ts bỏ kiểu), API bảng xếp hạng (lưu đĩa) và API benchmark.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { addEntry, sortEntries, validateEntry } from '../src/core/leaderboard.ts';
import type { LeaderboardEntry } from '../src/core/leaderboard.ts';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const LEADERBOARD_FILE = process.env.DDL_LEADERBOARD || path.join(ROOT, 'data', 'leaderboard.json');
export const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.ts': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
    return sortEntries((raw.entries ?? []).map(validateEntry).filter(Boolean) as LeaderboardEntry[]);
  } catch { return []; }
}
function writeLeaderboard(entries: LeaderboardEntry[]): void {
  fs.mkdirSync(path.dirname(LEADERBOARD_FILE), { recursive: true });
  const tmp = `${LEADERBOARD_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ entries }, null, 2) + '\n');
  fs.renameSync(tmp, LEADERBOARD_FILE);
}

function body(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(s)); } catch { resolve(null); } });
  });
}
const json = (res: http.ServerResponse, code: number, o: unknown) => { res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(o)); };

export interface Hooks { onBenchStart?: () => void; onBench?: (r: Record<string, unknown>) => void }

export function createServer(hooks: Hooks = {}): http.Server {
  return http.createServer(async (req, res) => {
    const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (url === '/api/leaderboard') {
      if (req.method === 'GET') return json(res, 200, { entries: readLeaderboard() });
      if (req.method === 'POST') {
        const e = validateEntry(await body(req));
        if (!e) return json(res, 400, { error: 'Tên 3–12 ký tự (chữ, số, _), điểm/seed/thời gian hợp lệ' });
        const r = addEntry(readLeaderboard(), e);
        writeLeaderboard(r.entries);
        return json(res, 200, r);
      }
    }
    if (url === '/api/bench-start' && req.method === 'POST') { hooks.onBenchStart?.(); return json(res, 200, { ok: true }); }
    if (url === '/api/bench' && req.method === 'POST') { const r = await body(req); hooks.onBench?.((r ?? {}) as Record<string, unknown>); return json(res, 200, { ok: true }); }
    if (url === '/vendor/three.module.js' && !fs.existsSync(path.join(ROOT, 'web', 'vendor', 'three.module.js'))) {
      res.writeHead(302, { location: THREE_CDN }); res.end(); return;
    }
    let file = url === '/' ? path.join(ROOT, 'web', 'index.html')
      : url === '/game.contract.json' ? path.join(ROOT, 'game.contract.json')
      : url.startsWith('/src/') ? path.join(ROOT, url) : path.join(ROOT, 'web', url);
    file = path.resolve(file);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    let out: string | Buffer = fs.readFileSync(file);
    if (file.endsWith('.ts')) out = stripTypeScriptTypes(out.toString('utf8'));
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(out);
  });
}
