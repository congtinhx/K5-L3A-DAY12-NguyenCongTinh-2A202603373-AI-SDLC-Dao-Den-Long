// Server tĩnh không dependency: phục vụ web/, game.contract.json và src/**/*.ts (bỏ kiểu TS khi phục vụ).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const ROOT = path.resolve(import.meta.dirname, '..');
const PORT = Number(process.env.PORT ?? 5173);
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.ts': 'text/javascript', '.png': 'image/png' };

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]);
  let file = url === '/' ? path.join(ROOT, 'web', 'index.html')
    : url === '/game.contract.json' ? path.join(ROOT, 'game.contract.json')
    : url.startsWith('/src/') ? path.join(ROOT, url) : path.join(ROOT, 'web', url);
  file = path.resolve(file);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  let body: string | Buffer = fs.readFileSync(file);
  if (file.endsWith('.ts')) body = stripTypeScriptTypes(body.toString('utf8'));
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(body);
}).listen(PORT, () => console.log(`Đảo Đèn Lồng: mở http://localhost:${PORT}  (Ctrl+C để dừng)`));
