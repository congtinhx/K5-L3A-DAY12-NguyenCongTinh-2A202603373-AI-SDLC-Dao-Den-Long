# Truy vết yêu cầu → bằng chứng — Phase 3 (Ticket-03, Contract v1.2)

Scenario: `tests/scenarios/*.json` (kỳ vọng tính tay), chạy qua CLI thật (`npm test`). Kết quả: `test-output.txt`, `verify-report.md`. Quyết định thiết kế: `docs/adr/0001-den-can-dau-luat-thang.md`. Breaking changes: `CHANGELOG.md`. Test cũ bị đổi/xóa: `docs/notes/test-changes-phase3.md`.

| Yêu cầu | Cách kiểm chứng | Bằng chứng | Kết quả |
|---|---|---|---|
| 1. Thắp → fuel 100; hao 1/giây | `deposit_light`, `p3_fuel_decay` (100 → 90.0 sau 600 tick) | test-output.txt | Đạt |
| 1. Châm dầu used = min(mang, ceil((100−fuel)/10)) | `p3_refuel` (used 6), `p3_refuel_small` (used 1) | test-output.txt | Đạt |
| 1. Hết dầu → tắt, deposited 0, lantern_out, ever_lit | `p3_lantern_out`, `p3_drain_lantern_out` | test-output.txt | Đạt |
| 1. Thắp lại cần 5, relight true, relit_count | `p3_relight` | test-output.txt | Đạt |
| 1. Đèn đầy dầu không được chọn | code (`l.lit && fuelT ≥ 6000 → bỏ qua`) | — | Có code; không có scenario vì đèn luôn hao trước bước tương tác nên trạng thái "đầy" không tới được bằng input |
| 1. Dầu tính bằng đơn vị nguyên 1/60 | ADR-0001 §2, `p3_relight` (99.7), `p3_drain` (18.7) | test-output.txt | Đạt |
| 2. fuel < 30 mất vùng an toàn; 30 vẫn an toàn | `p3_no_safe_low_fuel`, `p3_safe_at_30`, `safe_radius` | test-output.txt | Đạt |
| 2. Wander tới đèn yếu, ≤ 2 m → drain, hút 5/giây, fuel_drain mỗi 60 tick | `p3_drain` | test-output.txt | Đạt |
| 2. Drain → chase (Mây ≤ 6 m) / stunned / wander (đèn tắt) | `p3_drain_to_chase`, `p3_drain_pulse`, `p3_drain_lantern_out` | test-output.txt | Đạt |
| 2. Châm lên ≥ 30 → đẩy Bóng Mực ra trong 30 tick, không gây hit | `p3_refuel_evict` | test-output.txt | Đạt |
| 3. Không thắng sớm | `p3_no_early_win` | test-output.txt | Đạt |
| 3. Thắng ở bình minh nếu đèn sáng ≥ ceil(0.6 × tổng) | `p3_win_dawn` (597 tính tay), `p3_win_need_night2` | test-output.txt | Đạt |
| 3. Thua dawn / no_flames | `p3_lose_dawn_threshold`, `hit_invuln_lose`, `p2_fall_last_flame` | test-output.txt | Đạt |
| 3. Thời lượng 240/270/300 | `default_start`, `p2_night2_start`, `p2_night3_start` | test-output.txt | Đạt |
| 4. Sức chứa 10 + 2 × lần thắp, tối đa 20 | `deposit_light` (12), `p3_capacity_max` (20), `p3_capacity_pickup` | test-output.txt | Đạt |
| 5. Điểm mới (+5/đom đóm, +100, +40, +5/+15, bình minh) | `deposit_*`, `p3_relight` (65), `p3_drain_pulse` (15), `p3_win_dawn` (597) | test-output.txt | Đạt |
| 6. Chế độ mù màu (lưu), đèn tắt xẹp 20% + vết rách, nhấp nháy khi yếu | code `src/render/main.ts` (`settings.cb`, `tear`, `blinkSlow`) | — | Có code; **chưa có ảnh** |
| 7. Contract v1.2 (tuning, snapshot, scenario, event, drain) | unit tuning + schema v1.2 trong verify | verify-report.md | Đạt |
| Phase 1–2 không bị thay thế vẫn đạt | toàn bộ scenario cũ còn lại | test-output.txt | Đạt |
