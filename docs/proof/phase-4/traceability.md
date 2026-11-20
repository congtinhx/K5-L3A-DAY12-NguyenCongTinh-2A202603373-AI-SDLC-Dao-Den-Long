# Truy vết yêu cầu → bằng chứng — Phase 4 (Ticket-04, Contract v1.3)

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| §1 Bench: lệnh, cảnh chuẩn, camera, khởi động 3 s, công thức avg/p1-low/p95, bench.json | Code `tools/bench.ts` + `benchFrame/finishBench` trong `src/render/main.ts`; unit "Bench mode" (tắt sinh, sát thương, nhặt, hao dầu, kết thúc); chạy cảnh `#bench` | `img/bench-scene.jpg`, `img/bench-pane-result.jpg`, README.md (này) | Cảnh + đo: Đạt trong khung nhúng (42 FPS, vsync bật). **`bench.json` từ `bench_cmd`: tác giả tự chạy trên máy có Chrome** (xem `/bench.json` khi có) |
| §1 Ngưỡng avg ≥ 60, p1 ≥ 30, load ≤ 10 s | Đo trên máy chấm | — | Chưa biết (load ~2.9 s trong khung nhúng) |
| §2 Soak 10 Đêm, crashes 0, mem_end ≤ 1.2 × mem_start | `soak_cmd` + verify | `/soak.json`, `soak.json`, verify-report.md | Đạt (×1.04; heap ổn định) |
| §3 Bảng xếp hạng: tên 3–12, top 10, sắp xếp, ISO 8601 có múi giờ, lưu đĩa, export đúng thứ tự | unit `tests/unit/p4.test.ts`; verify "--export-leaderboard"; thử API POST/GET bằng curl | test-output.txt, verify-report.md | Đạt (logic + lưu đĩa + export); nhập tên sau khi thua → "Đã lưu — hạng 2": `docs/demo/demo.mp4` (0:55–1:08) |
| §3 Tiếng Việt có dấu (điểm cộng) | unit `validateName('Mây_Đèn')` | test-output.txt | Đạt |
| §4 Đổi phím (báo trùng, khôi phục mặc định, lưu) | code `renderKeymap`, `settings.keys` | — | Có code; **chưa có ảnh** |
| §4 Phụ đề/chỉ báo (Bóng Mực + mũi tên mép, gió, 10 s cuối, fuel < 30) | code `caption()`, `hud-shade-arrow` | — | Có code; **chưa có ảnh** |
| §4 Giảm chuyển động, chữ ≥ 18 px, chữ lớn ×1.25 | CSS `html{font-size:18px}`, `.big`; `settings.rm` chặn rung/chớp | — | Có code; **chưa có ảnh** |
| §5 Clone sạch ≤ 3 lệnh, README đủ mục, CHANGELOG 4 phase, CREDITS, LICENSE | clone sạch + build + headless | verify-report.md, README.md | Đạt |
| §5 Release v1.0.0 có bản chạy được | `release/dao-den-long-web-v1.0.0.zip` (thư mục web tĩnh) | file zip | Tác giả tạo GitHub Release |
| §6 Contract v1.3 (bench_cmd, soak_cmd), v1.0–v1.2 giữ nguyên | unit tuning + toàn bộ scenario | test-output.txt | Đạt |
| §7 Retro, video | `docs/notes/retro.md`; `docs/demo/demo.mp4` (1:08, chơi Đêm 1: nhặt, thắp đèn, thanh dầu, sức chứa 12, thua, lưu điểm) | retro.md, demo.mp4 | Retro: Đạt; video: Đạt phần chơi trực tiếp — **chưa quay cảnh chạy test/bench** (bằng chứng ở verify-report.md, bench.json) |
