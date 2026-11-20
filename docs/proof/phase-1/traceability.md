# Truy vết yêu cầu → bằng chứng — Phase 1

Mọi scenario nằm ở `tests/scenarios/<tên>.json` (kỳ vọng tính tay từ `docs/notes/assumptions-phase1.md`), chạy qua CLI thật bằng `npm test`. Kết quả: `test-output.txt`, `verify-report.md`.

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| Contract A: `game.contract.json`, tuning khớp code | Code đọc tuning từ chính file; unit test | `tests/unit/core.test.ts` | Đạt |
| Contract B: tham số, dừng khi đủ tick/kết thúc, mã thoát | scenario `bad_*` (mã 2), `snapshot_cadence`, `dawn_lose` | test-output.txt, verify-report (mã 2) | Đạt |
| Contract B: mô hình tick (snapshot 0 trước input, event tick = k+1) | `pickup_walk` (tick 35 tính tay), `deposit_light` (tick 1) | test-output.txt | Đạt |
| Contract C: inputs, giữ giá trị cũ, cạnh false→true | unit `InputTimeline`, `interact_edge_only`, `pulse_cooldown` | test-output.txt | Đạt |
| Contract C: công thức xoay cam_yaw + chuẩn hóa | `move_right_yaw0`, `cam_yaw_90`, `normalize` | test-output.txt | Đạt |
| Contract D: scenario (random_*, motes, shades, lanterns theo id, lit không cộng điểm) | `safe_radius` (score 0), `win_all_lit`, `bad_lantern_id` | test-output.txt | Đạt |
| Contract E: snapshot/event/end, làm tròn 3 số | `snapshot_cadence`, schema trong verify | verify-report.md | Đạt |
| Contract E: tính tất định | seed 42 chạy 2 lần so từng byte; seed khác thì khác | verify-report.md | Đạt |
| Màn mặc định: 5 đèn, xuất phát (0,0,0), 300 s, 3 lửa | `default_start` | test-output.txt | Đạt |
| Nhặt đom đóm (bán kính, sức chứa, thứ tự) | `pickup_walk`, `pickup_boundary`, `pickup_capacity`, `pickup_multi_order` | test-output.txt | Đạt |
| Nạp/thắp đèn | `deposit_light`, `deposit_partial`, `deposit_not_lit_yet`, `interact_*` | test-output.txt | Đạt |
| Bóng Mực xuất hiện + đuổi | `shade_spawn`, `pulse_stun_push` (đuổi lại sau choáng, vị trí 8.417 tính tay) | test-output.txt | Đạt |
| Tỏa sáng xua Bóng Mực (cost, radius, stun, push, cooldown) | `pulse_*` | test-output.txt | Đạt |
| Bị chạm: mất lửa, rơi đom đóm, bất tử | `hit_invuln_lose` | test-output.txt | Đạt |
| Bóng Mực sợ đèn (safe_radius) | `safe_radius` | test-output.txt | Đạt |
| Thắng / thua (no_flames, dawn) / điểm | `win_all_lit` (349 tính tay), `hit_invuln_lose`, `dawn_lose` | test-output.txt | Đạt |
| Chơi được Đêm 1 từ đầu tới thắng | Bot tự chơi (tools/bot.ts) → inputs → phát lại qua CLI | `tests/fixtures/bot-win-seed42.inputs.json`, verify-report.md | Đạt |
| Nhân vật đi, nhảy, camera 3D, HUD | `jump` scenario; ảnh chụp bản web | `img/hud-start.jpg` | Đạt |
| Mây đội nón lá treo đèn lồng nhỏ; vàng cam = tốt, tím đen = nguy hiểm | Ảnh chụp | `img/hud-start.jpg` | Đạt |
| Đảo sáng dần khi thắp đèn | Ảnh khi đã thắp 1/5 đèn: đèn phát sáng vàng cam, vùng quanh đèn được chiếu sáng; so với `hud-start.jpg` (0 đèn, tối) | `img/lantern-lit-safe-zone.png` | Đạt |
| Bóng Mực sợ đèn (hiển thị) | Cùng ảnh: vòng an toàn 6 m quanh đèn đã thắp, Bóng Mực (tím) đứng ngoài vòng | `img/lantern-lit-safe-zone.png` | Đạt |
| HUD: mang đầy 10/10, tỏa sáng "sẵn sàng" khi đủ ánh sáng (so với "thiếu ánh sáng" khi 0/10) | Ảnh chụp khi chơi | `img/carry-full-pulse-ready.png`, `img/lantern-lit-safe-zone.png` | Đạt |
| Chơi lại sau thắng/thua | Phím R gọi `newGame()` | — | **Chưa có ảnh/clip màn thắng/thua + chơi lại** (chưa đạt về bằng chứng; sẽ có trong video demo) |
| Tốc độ headless | 18000 tick | verify-report.md | Đạt (~0.6 s) |
