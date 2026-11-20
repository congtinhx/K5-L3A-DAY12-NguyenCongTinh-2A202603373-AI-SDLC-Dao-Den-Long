# ADR-0001 — Mô hình trạng thái đèn có nhiên liệu & luật thắng "giữ đảo sáng tới bình minh"

- **Trạng thái:** Chấp nhận (Phase 3, Ticket-03, Contract v1.2)
- **Bối cảnh:** Ticket-03 thay 3 luật cốt lõi: đèn đã sáng không nhận thêm đom đóm; Bóng Mực không bao giờ vào vùng an toàn; thắng ngay khi tất cả đèn sáng. Mục tiêu mới: giữ đủ đèn sáng tới bình minh.

## Quyết định
1. **Đèn là máy trạng thái 2 trạng thái + bộ nhớ**: `unlit ↔ lit`, thêm `fuel`, `ever_lit`, `relit_count`.
   - `unlit --(deposited ≥ cost)--> lit` với `cost = ever_lit ? 5 : 10`; khi sáng `fuel = 100`, `ever_lit = true`; thắp lại thì `relit_count++`.
   - `lit --(fuel ≤ 0, ngay sau bước 2)--> unlit`, `deposited = 0`, sự kiện `lantern_out`.
   - `lit` nhận châm dầu khi `fuel < 100`: `used = min(mang, ceil((100 − fuel)/10))`.
2. **Dầu lưu bằng số nguyên đơn vị 1/60** (`fuelT`, 100 dầu = 6000). Hao 1 đơn vị/tick (= 1/giây), Bóng Mực hút 5 đơn vị/tick. Chỉ chia 60 và làm tròn 1 chữ số khi xuất snapshot → không sai số cộng dồn, tất định tuyệt đối.
3. **Vùng an toàn là thuộc tính suy ra**: `safe(l) = l.lit && fuel ≥ 30` (đúng 30 vẫn an toàn). Mọi nơi dùng vùng an toàn (chặn Bóng Mực, điểm sinh, đẩy ra) gọi một hàm duy nhất.
4. **Bóng Mực thêm trạng thái `drain`** (spawning/wander/chase/recoil/stunned/drain). Wander chọn mục tiêu: đèn sáng có fuel < 30 gần nhất → nếu không có thì đèn tắt gần nhất → nếu không có thì điểm ngẫu nhiên. Hút được tính ở bước 2 của tick sau (theo thứ tự tick của ticket).
5. **Luật thắng chuyển sang kiểm tra tại tick bình minh**, không còn thắng sớm: sau mọi cập nhật của tick, `flames ≤ 0 → lost/no_flames` trước; nếu hết giờ: `lit ≥ ceil(0.6 × tổng) → won/dawn_survived`, ngược lại `lost/dawn`.
6. **Điểm**: bỏ thưởng thời gian; thêm điểm bình minh theo từng đèn đang sáng (+50 + floor(fuel)).

## Hệ quả
- Test Phase 1–2 phụ thuộc "thắng khi thắp hết", điểm cũ, thời lượng cũ được cập nhật (xem `docs/notes/test-changes-phase3.md`); không skip test nào.
- Headless: `game_over.reason` không còn `all_lit`.
- HUD đổi từ "đèn k/n" sang "đèn sáng k/n (cần m)" + thanh dầu; bot/AI phải quay lại châm dầu.
- Lựa chọn khác đã cân nhắc: lưu fuel số thực (bị loại vì sai số khi so ngưỡng 30 và 0); thêm trạng thái `low` cho đèn (bị loại — "yếu" chỉ là điều kiện fuel < 30, không cần trạng thái riêng).
