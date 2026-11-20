# Thay đổi test Phase 1 do Ticket-02 (số chuẩn)

Ticket-02 Phần 1 yêu cầu **thay mọi giá trị tự chọn** bằng số chuẩn, nên các scenario Phase 1 có kỳ vọng phụ thuộc số cũ được **tính tay lại** theo số chuẩn (không chép output). Mỗi file scenario bị đổi có trường `changed_in_phase2` ghi lý do. Không có test nào bị skip.

| Scenario | Thay đổi & lý do |
|---|---|
| `default_start` | Ticket-02: 20 đom đóm ban đầu (không còn 60) |
| `deposit_light` | Điểm chuẩn: +10 mỗi đom đóm NẠP (Phase 1 cộng khi nhặt) |
| `deposit_not_lit_yet` | Điểm chuẩn: +10 mỗi đom đóm nạp |
| `interact_boundary_in` | interact_radius 2.5 → 2.0 |
| `interact_out_of_range` | interact_radius 2.5 → 2.0 (giữ ý nghĩa biên ngoài) |
| `island_clamp` | BỎ: luật biên vô hình bị thay bằng rơi khỏi đảo (fall_enabled=true). Thay bằng p2_fall_respawn, p2_fall_last_flame |
| `jump` | Vận tốc nhảy 6 → 7 m/s |
| `pickup_boundary` | pickup_radius 1.5 → 1.0 |
| `pickup_walk` | pickup 1.5 → 1.0 (tick 35 → 40); điểm chỉ cộng khi nạp |
| `pulse_cooldown` | pulse_cooldown 1 s → 3 s, pulse_cost 2 → 3 |
| `pulse_out_of_radius` | pulse_cost 2 → 3, bán kính 6 → 5 (3D) |
| `pulse_stun_push` | Số chuẩn: cost 3, bán kính 5 m 3D (Bóng Mực dời từ 5 m về 4 m vì 3D tới tâm (0,0.8,0) là 5.06 > 5), choáng 120, đẩy dần 15 tick, +5, tốc độ 4 m/s |
| `shade_spawn` | Lịch chuẩn: 2 con tại tick 300 (Phase 1: 1 con tại tick 600) |
| `win_all_lit` | Điểm chuẩn (+10/đom đóm nạp, giây ×2) |
| `pulse_not_enough_light` | pulse_cost 2 → 3 (carried 1 → 2 để vẫn kiểm đúng biên) |

Các scenario Phase 1 còn lại (`cam_yaw_90`, `move_*`, `normalize`, `snapshot_cadence`, `pickup_capacity`, `pickup_multi_order`, `interact_nearest`, `interact_edge_only`, `deposit_partial`, `hit_invuln_lose`, `safe_radius`, `dawn_lose`, `bad_*`) **giữ nguyên kỳ vọng và vẫn đạt** với số chuẩn (regression).
