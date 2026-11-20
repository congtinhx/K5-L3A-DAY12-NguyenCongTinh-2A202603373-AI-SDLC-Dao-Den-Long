# AGENTS.md — Đảo Đèn Lồng

Game 3D (Three.js, trình duyệt), **3 Đêm**, + chế độ headless theo **Test Contract v1.2** (`docs/lab/ticket-02.txt` + `ticket-03.txt`). Quyết định thiết kế: `docs/adr/`. Breaking changes: `CHANGELOG.md`.
Không có dependency npm: Node ≥ 22.18 chạy TypeScript trực tiếp (type stripping). Three.js nạp từ CDN qua importmap.

## Lệnh
- `npm run build` — kiểm tra Node + tạo `dist/web` (bản web tĩnh).
- `npm start` — mở game ở http://localhost:5173.
- `npm test` — unit test + toàn bộ `tests/scenarios/*.json` chạy qua CLI thật.
- `PHASE=phase-N npm run verify` — test + tất định 3 Đêm + schema v1.1 + tốc độ 21 600 tick → `docs/proof/phase-N/`.
- `npm test` mất ~35 s (mỗi scenario chạy CLI thật) — đừng chạy nhiều lần trong một lệnh có timeout 120 s.
- Headless: `node src/headless/cli.ts --seed 1 --night 1|2|3 --ticks 600 --out out/run.jsonl [--scenario f] [--inputs f]`.
- Bot: `node tools/bot.ts --seed 5 --night 1` (sinh inputs; dùng làm fixture).

## Luật bắt buộc
- Luật game = `docs/notes/assumptions-phase2.md` (ưu tiên) + `assumptions-phase1.md`. **Không tự bịa luật**; luật mới phải ghi vào file assumptions trước.
- **Thứ tự tick 12 bước** của Ticket-02 là bắt buộc — `Sim.step` chia đúng các bước có đánh số; giữ nguyên thứ tự khi sửa.
- Bản đồ chuẩn chỉ ở `src/core/map.ts` (góc từ +X ngược kim đồng hồ: `(r·cosθ, y, r·sinθ)`).
- Tên trạng thái cố định: Bóng Mực `spawning|wander|chase|recoil|stunned|drain`; Gió Lạc `idle|chase|flee|removed`.
- **Dầu đèn là số nguyên đơn vị 1/60** (`Lantern.fuelT`, 100 = 6000); chỉ chia 60 khi xuất. Vùng an toàn chỉ qua `Sim.isSafe(l)` (lit && fuel ≥ 30). Không còn thắng sớm: thắng/thua chỉ xét ở bước 11 (ADR-0001).
- Ticket mới [THAY THẾ] luật cũ → viết ADR trong `docs/adr/`, thêm mục BREAKING vào `CHANGELOG.md`, ghi `test-changes-phaseN.md`.
- So sánh biên khoảng cách/hình học luôn có sai số 1e-9 (đã gặp lỗi cộng dồn 0.1 ở Phase 2).
- Số tuning chỉ đọc từ `game.contract.json` (không hard-code lại trong code).
- `src/core/` thuần logic: không import `three`, DOM, `fs`; không `Math.random`/`Date.now` — mọi ngẫu nhiên qua `Rng` có seed.
- `src/render/` chỉ đọc state từ core + gửi InputState; không chứa luật. Tạm dừng ở bản thường cũng đi qua input `pause` của core. Màu theo bảng chuẩn (hằng `C` trong `main.ts`).
- TypeScript chỉ dùng cú pháp xóa được (không `enum`, không parameter properties); import kiểu bằng `import type`; import nội bộ có đuôi `.ts`.
- Output headless: tọa độ làm tròn 3 chữ số; dòng cuối luôn là `end`; lỗi file inputs/scenario → mã 2.

## Cấm
- Sửa kỳ vọng trong `tests/scenarios/*.json` để test đạt. Kỳ vọng tính tay từ luật; nếu ticket đổi luật: sửa kỳ vọng **bằng tính tay**, thêm trường `changed_in_phase2` (hoặc tương ứng) + ghi vào `docs/notes/test-changes-phaseN.md`.
- Mỗi tính năng mới phải có ≥ 1 scenario headless (DoD Ticket-02).
- `test.skip`/xóa test không kèm lý do. Sửa tay file trong `docs/proof/`.
- Scenario mới phải "phá thử" được: đổi tạm code sai đi một chút thì test phải đỏ (đã gặp test luôn đạt ở Phase 1).

## Xong việc nghĩa là
`npm test` xanh, `npm run verify` xanh, đã cập nhật `docs/proof/phase-N/traceability.md`. Hook Stop chặn kết thúc khi test đỏ.
