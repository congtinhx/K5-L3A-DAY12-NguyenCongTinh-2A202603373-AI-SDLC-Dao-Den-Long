# Truy vết yêu cầu → bằng chứng — Phase 2 (Ticket-02, Contract v1.1)

Scenario: `tests/scenarios/*.json` (kỳ vọng tính tay từ ticket + `docs/notes/assumptions-phase2.md`), chạy qua CLI thật bằng `npm test`. Kết quả: `test-output.txt`, `verify-report.md`. Test Phase 1 bị số chuẩn làm đổi: `docs/notes/test-changes-phase2.md`.

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Phần 1 — số chuẩn trong tuning | unit "Tuning … khớp số chuẩn" | test-output.txt | Đạt |
| Regression Phase 1 với số chuẩn | 31 scenario P1 (15 tính lại có lý do, 16 giữ nguyên) | test-output.txt, test-changes-phase2.md | Đạt |
| Di chuyển/nhảy 7 m/s | `jump`, `move_*`, `normalize` | test-output.txt | Đạt |
| Lướt 14 m/s / 0.2 s / hồi 1.5 s từ lúc bắt đầu | `p2_dash_basic`, `p2_dash_cooldown_early`, `p2_dash_cooldown_ready` | test-output.txt | Đạt |
| Lướt trên không giữ độ cao | `p2_dash_air` | test-output.txt | Đạt |
| Nhặt XZ ≤ 1.0 | `pickup_boundary`, `pickup_walk` | test-output.txt | Đạt |
| 20 đom đóm ban đầu, +1 mỗi 240 tick | `default_start`, `p2_mote_spawn` | test-output.txt | Đạt |
| Tương tác 2.0 m, gần nhất | `interact_*` | test-output.txt | Đạt |
| Vùng an toàn chặn + đẩy ra trong 30 tick | `safe_radius`, `p2_safe_evict` | test-output.txt | Đạt |
| Tỏa Sáng 3 / 5 m 3D / 3 s / choáng 120 / đẩy 4 m trong 15 tick / +5 | `pulse_*`, `p2_pulse_3d` | test-output.txt | Đạt |
| Bóng Mực 4 m/s, phát hiện 12, lịch 2 con tick 300, spawning | `shade_spawn`, `pulse_stun_push` (đuổi lại 4 m/s) | test-output.txt | Đạt |
| Bị đánh: −1, rơi floor(n/2) ra vành 1.5–2.5 m TTL 480, bất tử 90, recoil | `p2_hit_drop_ring`, `hit_invuln_lose` | test-output.txt | Đạt |
| Rơi khỏi đảo, hồi sinh, thua khi hết lửa | `p2_fall_respawn`, `p2_fall_last_flame` | test-output.txt | Đạt |
| Thắng/thua & điểm chuẩn | `win_all_lit` (548 tính tay), `dawn_lose`, `deposit_*` | test-output.txt | Đạt |
| Thứ tự tick 12 bước + pause | `p2_pause` + code `Sim.step` đánh số bước | test-output.txt | Đạt |
| Bản đồ Đêm 2 (đèn, cầu, bục, bùa) | `p2_night2_start`, `p2_launch_pad`, unit "Bản đồ chuẩn" | test-output.txt | Đạt |
| Bản đồ Đêm 3 (tầng, vách, dốc, bục, tháp, gió) | `p2_night3_start`, `p2_n3_wall`, `p2_n3_ramp`, `p2_n3_pad`, `p2_wind` | test-output.txt | Đạt |
| Gió Lạc (chase/cướp/flee/removed, pulse, sinh tick 1200) | `p2_drifter_*` | test-output.txt | Đạt |
| Bùa Gió (7.2 m/s, lướt không hồi chiêu, xuất hiện lại 2700) | `p2_charm_*` | test-output.txt | Đạt |
| Contract v1.1: snapshot/scenario/input/event mới, tên trạng thái | schema check 3 Đêm + scenario | verify-report.md | Đạt |
| Tất định 3 Đêm | seed 42 × 2 | verify-report.md | Đạt |
| Headless 21 600 tick ≤ 30 s | đo 3 Đêm | verify-report.md (~2–4 s) | Đạt |
| Menu → giới thiệu Đêm (Ông Đăng) → chơi | ảnh | `img/menu.jpg`, `img/intro-night1.jpg` | Đạt |
| Kết quả / Đêm kế / Bình Minh / chơi lại khi thua | code `onEvents` trong `src/render/main.ts` | — | **Chưa có ảnh** (cần chơi tới hết Đêm) |
| Tạm dừng Esc/P với 4 lựa chọn | ảnh + `p2_pause` (logic đứng yên) | `img/pause-menu.jpg` | Đạt |
| Cài đặt âm lượng/độ nhạy lưu giữa các lần mở | code (localStorage, try/catch) | — | **Chưa có ảnh** |
| Âm thanh (nhạc nền + 10 hiệu ứng) | code `src/render/audio.ts` | — | Có code; **chưa có video** |
| HUD đầy đủ đúng vị trí, mũi tên tới đèn ngoài màn hình | ảnh | `img/fps-1280x720.jpg`, `img/arrow-shades.jpg`, `img/hud-night1.jpg` | Đạt (nhắc "E — Nạp ánh sáng" và đồng hồ đỏ ≤ 30 s: có code, chưa có ảnh) |
| Bảng màu chuẩn, ánh sáng môi trường 0.15 + 0.55 × tiến độ | hằng `C` + `ambient.intensity` trong `main.ts`; ảnh | `img/fps-1280x720.jpg` | Đạt |
| ≥ 30 FPS ở 1280×720 | bộ đếm `#fps` trên trang chạy thử | `img/fps-1280x720.jpg` (60 fps, tb 49.5; khung 1280×640 do thanh tiêu đề trang) | Đạt (đo trên máy tác giả, không phải máy chấm) |
