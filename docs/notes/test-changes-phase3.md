# Thay đổi test do Ticket-03 (Change Request "Đèn cạn dầu")

Ticket-03 [THAY THẾ] luật thắng, thời lượng Đêm và công thức điểm. Các test bị luật mới làm sai được **tính tay lại** hoặc **xóa có lý do**; không skip test nào. Mỗi file bị đổi có trường `changed_in_phase3`.

| Test | Thay đổi & lý do |
|---|---|
| `default_start` | Ticket-03: Đêm 1 = 240 s; thêm kiểm tra capacity 10, fuel 0 |
| `deposit_light` | Ticket-03: +5 mỗi đom đóm nạp (cũ +10); lantern_lit có relight; sức chứa tăng |
| `deposit_not_lit_yet` | Ticket-03: +5 mỗi đom đóm nạp |
| `p2_night2_start` | Ticket-03: Đêm 2 = 270 s |
| `p2_night3_start` | Ticket-03: Đêm 3 = 300 s |
| `p2_pause` | Ticket-03: Đêm 1 = 240 s → time_left 240 − 10/60 = 239.833 |
| `win_all_lit` | XÓA: luật "thắng ngay khi tất cả đèn sáng" bị [THAY THẾ]. Thay bằng p3_no_early_win, p3_win_dawn, p3_lose_dawn_threshold |
| unit `Tuning … Ticket-02 + Ticket-03` | Kiểm thêm khóa dầu, thời lượng 240/270/300, điểm mới |

Các test khác của Phase 1–2 **không bị thay thế** và vẫn đạt nguyên kỳ vọng (regression), ví dụ `safe_radius` (đèn đặt sẵn fuel 100 vẫn ≥ 30 suốt 300 tick), `p2_safe_evict`, `pulse_*`, `p2_*`.
