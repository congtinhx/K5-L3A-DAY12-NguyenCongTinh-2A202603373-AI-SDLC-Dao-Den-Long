# Đánh giá Phase 4

**Đạt:** contract v1.3; soak 10 Đêm 0 crash, RSS ×1.04 (heap ổn định); bảng xếp hạng (logic có unit test, lưu đĩa qua server, export đúng thứ tự, tên tiếng Việt); cảnh bench chuẩn + launcher + công thức đo; tiếp cận (đổi phím báo trùng, phụ đề, giảm chuyển động, chữ ≥ 18 px/×1.25); README/CHANGELOG/CREDITS/LICENSE; retro.

**Không hỏng phase trước:** toàn bộ 73 scenario Phase 1–3 + unit vẫn đạt; luật/headless không đổi (cờ `bench` chỉ bật trong cảnh bench).

**Chưa đạt / rủi ro:**
- `bench.json` chính thức chưa có từ phía AI (không có trình duyệt) — tác giả chạy `npm run bench` trên máy có Chrome rồi commit.
- FPS chỉ đo trong khung nhúng (42 avg, p1 14.7, vsync bật) — chưa chắc đạt ngưỡng 60/30 trên máy chấm.
- Chưa có ảnh: màn bảng xếp hạng, nhập tên, Cài đặt (đổi phím), phụ đề.
- Soak dùng cờ tắt JIT tối ưu — đã giải thích và khai trong `soak_cmd`.
