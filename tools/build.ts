// build: kiểm tra Node, kiểm tra contract, xuất bản web tĩnh dist/web (JS đã bỏ kiểu) để phát hành.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 18)) { console.error(`Cần Node >= 22.18 (đang dùng ${process.versions.node})`); process.exit(1); }
const ROOT = path.resolve(import.meta.dirname, '..');
JSON.parse(fs.readFileSync(path.join(ROOT, 'game.contract.json'), 'utf8'));
const OUT = path.join(ROOT, 'dist', 'web');
fs.rmSync(OUT, { recursive: true, force: true });
const copyTs = (srcDir: string) => {
  for (const f of fs.readdirSync(srcDir, { recursive: true }) as string[]) {
    const src = path.join(srcDir, f);
    if (!f.endsWith('.ts')) continue;
    const dst = path.join(OUT, path.relative(ROOT, src)).replace(/\.ts$/, '.js');
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const js = stripTypeScriptTypes(fs.readFileSync(src, 'utf8')).replace(/(from\s+['"]\.{1,2}\/[^'"]+)\.ts(['"])/g, '$1.js$2');
    fs.writeFileSync(dst, js);
  }
};
copyTs(path.join(ROOT, 'src', 'core'));
copyTs(path.join(ROOT, 'src', 'render'));
fs.writeFileSync(path.join(OUT, 'index.html'), fs.readFileSync(path.join(ROOT, 'web', 'index.html'), 'utf8').replace('/src/render/main.ts', './src/render/main.js'));
fs.copyFileSync(path.join(ROOT, 'game.contract.json'), path.join(OUT, 'game.contract.json'));
console.log(`build OK (Node ${process.versions.node}) → dist/web; headless: node src/headless/cli.ts`);
