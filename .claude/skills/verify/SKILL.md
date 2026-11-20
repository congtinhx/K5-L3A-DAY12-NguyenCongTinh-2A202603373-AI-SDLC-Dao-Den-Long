---
name: verify
description: Chạy kiểm chứng Đảo Đèn Lồng (unit + scenario headless + tất định) và lưu bằng chứng vào docs/proof. Dùng trước khi báo "xong", trước khi gắn tag phase-N, hoặc khi người dùng hỏi game có đúng contract không.
---

# Verify

1. `npm test` — nếu đỏ: đọc assertion lỗi, sửa **code** (không sửa kỳ vọng trong `tests/scenarios`), chạy lại.
2. `PHASE=phase-1 npm run verify` — chạy toàn bộ test, chạy seed 42 hai lần so từng byte, seed 43 phải khác, kiểm tra schema JSONL, đo thời gian 18000 tick; ghi `docs/proof/<PHASE>/verify-report.md` và các file `.jsonl` mẫu.
3. Mở `docs/proof/<PHASE>/verify-report.md`, đối chiếu từng dòng của `traceability.md`: cột Kết quả chỉ ghi "Đạt" khi có bằng chứng tương ứng; còn lại ghi "Chưa đạt" + lý do.
4. Yêu cầu chỉ thấy bằng mắt (HUD, đảo sáng dần, chơi lại): chụp ảnh/clip vào `docs/proof/<PHASE>/img/` kèm chú thích yêu cầu nào.
5. Không commit nếu bước 1–2 đỏ.
