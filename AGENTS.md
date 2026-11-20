# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js, trình duyệt) + chế độ headless theo **Test Contract v1.0** (`docs/lab/` + PRD trên lab board).
Không có dependency npm: Node ≥ 22.18 chạy TypeScript trực tiếp (type stripping). Three.js nạp từ CDN qua importmap.

## Lệnh
- `npm run build` — kiểm tra Node + tạo `dist/web` (bản web tĩnh).
- `npm start` — mở game ở http://localhost:5173.
- `npm test` — unit test + toàn bộ `tests/scenarios/*.json` chạy qua CLI thật.
- `npm run verify` — test + kiểm tra tất định + ghi bằng chứng vào `docs/proof/`.
- Headless: `node src/headless/cli.ts --seed 1 --night 1 --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f]`.

## Luật bắt buộc
- Luật game = `docs/notes/assumptions-phase1.md`. **Không tự bịa luật**; luật mới phải ghi vào file assumptions trước.
- Số tuning chỉ đọc từ `game.contract.json` (không hard-code lại trong code).
- `src/core/` thuần logic: không import `three`, DOM, `fs`; không `Math.random`/`Date.now` — mọi ngẫu nhiên qua `Rng` có seed.
- `src/render/` chỉ đọc state từ core + gửi InputState; không chứa luật.
- TypeScript chỉ dùng cú pháp xóa được (không `enum`, không parameter properties); import kiểu bằng `import type`; import nội bộ có đuôi `.ts`.
- Output headless: tọa độ làm tròn 3 chữ số; dòng cuối luôn là `end`; lỗi file inputs/scenario → mã 2.

## Cấm
- Sửa kỳ vọng trong `tests/scenarios/*.json` để test đạt. Kỳ vọng tính tay từ luật; nếu luật đổi, ghi lý do trong `docs/notes/`.
- `test.skip`/xóa test không kèm lý do. Sửa tay file trong `docs/proof/`.
- Scenario mới phải "phá thử" được: đổi tạm code sai đi một chút thì test phải đỏ (đã gặp test luôn đạt ở Phase 1).

## Xong việc nghĩa là
`npm test` xanh, `npm run verify` xanh, đã cập nhật `docs/proof/phase-N/traceability.md`. Hook Stop chặn kết thúc khi test đỏ.
