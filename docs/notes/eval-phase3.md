# Đánh giá Phase 3

**Đạt:** toàn bộ luật mới của Ticket-03 có scenario headless tính tay (18 scenario mới), contract v1.2, ADR-0001 mô tả mô hình trạng thái đèn và luật thắng, CHANGELOG liệt kê breaking changes. Dầu tính bằng số nguyên 1/60 nên không có sai số ở ngưỡng 30 và 0.

**Có hỏng phase trước không?** 7 test bị luật mới làm sai được tính lại có lý do, `win_all_lit` bị xóa có lý do (luật thắng sớm bị thay); không skip test nào. Các test Phase 1–2 còn lại vẫn đạt nguyên kỳ vọng.

**Chưa đạt / rủi ro:**
- Trường hợp "đèn đầy dầu không được chọn" chỉ có code, không có scenario (trạng thái không tới được bằng input vì đèn hao trước bước tương tác).
- Chưa có ảnh cho thanh dầu, nhấp nháy, chế độ mù màu, màn kết quả bình minh.
- Bot chưa biết châm dầu nên không thể thắng theo luật mới.
- Giả định: Bóng Mực wander đi tới đèn yếu với tốc độ wander 1.5 m/s; khi không có đèn yếu thì đi về đèn tắt gần nhất (theo câu "như trước" của ticket), không có thì đi điểm ngẫu nhiên.

**Harness:** AGENTS.md thêm luật fuel số nguyên, `isSafe`, quy trình ADR/CHANGELOG/test-changes khi ticket thay luật.
