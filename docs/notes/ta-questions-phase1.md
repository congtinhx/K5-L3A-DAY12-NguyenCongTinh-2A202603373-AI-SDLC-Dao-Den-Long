# Câu hỏi cho trợ giảng — Phase 1

Trạng thái: **chưa hỏi được.** Trợ giảng trên lab board báo "chỉ chạy khi mở trang trong claude.ai" khi mở qua khung trình duyệt của app, nên chưa nhận được câu trả lời. Đang dùng giả định bên dưới; nếu trợ giảng/giảng viên trả lời khác sẽ cập nhật assumptions + scenario kèm lý do.

| # | Câu hỏi | Giả định đang dùng | Lý do |
|---|---|---|---|
| 1 | `safe_radius` áp dụng cho mọi đèn hay chỉ đèn đã thắp? | Chỉ đèn **đã thắp** | PRD: "Bóng Mực sợ những chiếc đèn" + đảo đang tối; thắp đèn mới tạo vùng an toàn → có lý do để thắp sớm |
| 2 | Tỏa sáng "tốn ánh sáng" là tốn đom đóm đang mang hay tốn lửa (flames)? | Tốn **2 đom đóm đang mang** | flames là máu (thua khi `no_flames`); tốn máu để tự vệ sẽ phản trực giác |
| 3 | Khi game kết thúc giữa hai mốc snapshot, có cần snapshot cuối không? | **Không** thêm snapshot; trạng thái cuối nằm ở dòng `end` | Contract nói snapshot "mỗi --snapshot-every tick"; thêm dòng ngoài lịch có thể làm sai test đếm snapshot |
