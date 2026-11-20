# Đánh giá Phase 2

**Đạt:** toàn bộ Phần 1 (số chuẩn), Phần 2 (3 bản đồ), logic Phần 3 (lướt, rơi, Gió Lạc, Bùa Gió, pause, gió) và Contract v1.1 đều có scenario headless tính tay (25 scenario mới, mỗi tính năng ≥ 1). Tất định 3 Đêm; 21 600 tick chạy 2–4 s (giới hạn 30 s). Bản giao diện có đủ luồng menu/giới thiệu/kết quả/Bình Minh/tạm dừng/cài đặt/âm thanh/HUD/bảng màu; ≥ 30 FPS ở 1280×720 trên máy tác giả.

**Có hỏng phase trước không?** Không có test Phase 1 nào bị tắt. 15 scenario P1 có kỳ vọng phụ thuộc số tự chọn được **tính tay lại** theo số chuẩn (lý do từng cái: `test-changes-phase2.md`); `island_clamp` bị bỏ vì luật biên vô hình bị thay bằng rơi khỏi đảo (thay bằng 2 scenario rơi). 16 scenario P1 còn lại giữ nguyên kỳ vọng và vẫn đạt.

**Chưa đạt / rủi ro:**
- Bot tự chơi (heuristic đơn giản) **chưa thắng** được Đêm nào với số chuẩn (thắp tối đa 3/5 đèn ở Đêm 1). Khả năng thắng được chứng minh bằng scenario `win_all_lit` và chơi tay, chưa bằng một ván tự động trọn vẹn.
- Chưa có ảnh: màn kết quả/Bình Minh, Cài đặt, nhắc "E — Nạp ánh sáng", đồng hồ đỏ ≤ 30 s; âm thanh chưa có video.
- Các giả định §2 trong `assumptions-phase2.md` (spawning 60 tick, wander 1.5 m/s, xuất phát Đêm 3 (0,0,−30)…) chưa được trợ giảng xác nhận.
- FPS đo trên máy tác giả (i5-1240P), không phải máy chấm.

**Cần chỉnh harness:** AGENTS.md thêm luật thứ tự tick 12 bước, tên trạng thái cố định, sai số hình học 1e-9, `npm test` ~35 s; skill verify cập nhật cho 3 Đêm + ảnh `#fps`.
