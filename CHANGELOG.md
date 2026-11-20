# CHANGELOG

## [1.0.0 / Phase 4] — Contract v1.3 "Bình minh"
### Added
- `bench_cmd` (`node tools/bench.ts`): cảnh benchmark chuẩn trong Chrome 1280×720, vsync tắt, xuất `bench.json` (avg_fps, p1_low_fps, frame_ms_p95, frames, load_ms, peak_mem_mb…).
- `soak_cmd` (`node --expose-gc --no-opt --no-maglev tools/soak.ts`): 10 Đêm liên tiếp, xuất `soak.json`.
- Bảng xếp hạng cục bộ top 10 (lưu đĩa `data/leaderboard.json`), màn hình từ menu, nhập tên sau Bình Minh/khi thua, `--export-leaderboard`.
- Tiếp cận: đổi phím (báo trùng, khôi phục mặc định, lưu), phụ đề/chỉ báo (Bóng Mực xuất hiện + mũi tên mép màn hình, gió sắp thổi, 10 s cuối, đèn sắp cạn dầu), giảm chuyển động (tắt rung camera, chớp màn hình), chữ ≥ 18 px + chữ lớn ×1.25.
- Three.js có thể đặt cục bộ ở `web/vendor/` để chơi offline.
### Changed
- `run_cmd` = `node tools/serve.ts` (server có API bảng xếp hạng). Bóng Mực và đom đóm vẽ bằng InstancedMesh (bench 200 Bóng Mực: 1 → 42 FPS trong khung trình duyệt nhúng).
### BREAKING CHANGES
- `contract_version` "1.3"; Sim có cờ `bench` (chỉ dùng cho cảnh benchmark). Không đổi luật/headless v1.0–v1.2.

## [Phase 3] — Contract v1.2 "Đèn cạn dầu"
### BREAKING CHANGES
- **Luật thắng:** bỏ thắng sớm khi thắp hết đèn. Thắng chỉ ở tick bình minh nếu còn sống và số đèn đang sáng ≥ ceil(0.6 × tổng). `game_over.reason`: `all_lit` **bị bỏ**, thêm `dawn_survived`.
- **Thời lượng Đêm:** 300/330/360 s → **240/270/300 s** (`night*_duration_s`).
- **Điểm:** +10/đom đóm nạp → **+5**; bỏ thưởng giây còn lại; thêm +40 thắp lại, +15 khi Tỏa Sáng trúng Bóng Mực đang hút; bình minh +50 + floor(fuel) mỗi đèn sáng, +50 mỗi Ngọn Lửa.
- **Đèn đã sáng nhận đom đóm** (châm dầu, event `refuel`) và **có thể tắt** (event `lantern_out`); `lantern_lit` thêm `relight`.
- **Vùng an toàn** chỉ còn khi `fuel ≥ 30`; Bóng Mực có trạng thái mới **`drain`**.
- **Sức chứa** không còn cố định 10: `10 + 2 × successful_lights`, tối đa 20.
- Snapshot: đèn thêm `fuel`, `ever_lit`, `relit_count`; `player.capacity`. Scenario: đèn `lit/fuel/ever_lit`, `player.successful_lights`, `shades[].target_lantern_id`. Event mới `fuel_drain`.
- Tuning thêm: `fuel_max, fuel_decay_per_s, fuel_per_mote, relight_cost, win_ratio, drain_per_s, low_fuel_threshold, capacity_max`.
### Added
- Chế độ "Bảng màu dễ phân biệt" (lưu trong Cài đặt); thanh dầu trên đèn, nhấp nháy 1 Hz khi fuel < 30.

## [Phase 2] — Contract v1.1 "Ba hòn đảo"
### BREAKING CHANGES
- Số liệu chuẩn thay toàn bộ số tự chọn Phase 1 (xem `docs/notes/test-changes-phase2.md`); `fall_enabled = true`; 3 Đêm; snapshot/scenario/input/event mở rộng theo v1.1.

## [Phase 1] — Contract v1.0
- Đêm 1 Đảo Bến chơi được, headless theo Test Contract v1.0.
