// run_cmd: node tools/serve.ts            → mở game ở http://localhost:5173
//          node tools/serve.ts --export-leaderboard out.json → xuất bảng xếp hạng {"entries": [...]} rồi thoát
import fs from 'node:fs';
import path from 'node:path';
import { createServer, readLeaderboard } from './server.ts';

const i = process.argv.indexOf('--export-leaderboard');
if (i >= 0) {
  const out = process.argv[i + 1];
  if (!out) { console.error('thiếu đường dẫn: --export-leaderboard out.json'); process.exit(1); }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ entries: readLeaderboard() }, null, 2) + '\n');
  console.log(`Đã xuất ${readLeaderboard().length} mục → ${out}`);
  process.exit(0);
}
const PORT = Number(process.env.PORT ?? 5173);
createServer().listen(PORT, () => console.log(`Đảo Đèn Lồng: mở http://localhost:${PORT}  (Ctrl+C để dừng)`));
