# Nhật ký dùng AI

Công cụ: Claude (Opus) trong Claude app, có shell trên máy và trình duyệt tích hợp. Harness: `AGENTS.md`, hook Stop, skill `verify`, CI.

## Phase 1

**Cách làm:** đọc PRD-0 → chốt luật + số tuning vào `assumptions-phase1.md` **trước khi code** → viết 32 scenario với kỳ vọng tính tay → harness → core + CLI → render → verify → ghi chép → tag.

**Prompt chính (tóm tắt):**
1. "Đọc toàn bộ dự án, liệt kê đầu việc, hướng dẫn chi tiết" (chưa code).
2. "Dạy tôi cách làm Phase 1" (kèm PRD-0) → đề xuất luật, số tuning, thứ tự tick, danh sách scenario.
3. "Chốt luật như gợi ý, ghi vào assumptions, hỏi trợ giảng 3 câu, rồi làm lần lượt bước 3 → hết".

**AI sai ở đâu & cách phát hiện:**
| Lỗi | Phát hiện bằng | Sửa / chỉnh harness |
|---|---|---|
| Viết `constructor(private readonly frames)` — Node type stripping không hỗ trợ | Tự rà trước khi chạy (AGENTS.md có luật "cú pháp xóa được") | Sửa thành field thường; luật đã có trong AGENTS.md |
| Scenario `interact_edge_only` ban đầu **luôn đạt** (sau lần nạp đầu đã hết đom đóm) | Rà lại kỳ vọng: test không thể thất bại | Viết lại: còn 5 đom đóm + đèn L2 trong tầm; thêm luật "phá thử" vào AGENTS.md |
| Biểu thức nhấp nháy khi bất tử trong render vô nghĩa (luôn true khi đang bất tử nhưng viết rườm rà) | Đọc diff | Rút gọn `sim.tick < p.invulnUntil` |
| `fetch('/game.contract.json')` tuyệt đối → hỏng khi host bản web ở thư mục con | Chạy thử bản dist trên trang artifact | Đổi sang đường dẫn tương đối |
| File inputs của bot để trong thư mục proof của phase → CI (`PHASE=ci`) không tìm thấy | Chạy `PHASE=ci npm run verify` | Chuyển sang `tests/fixtures/` |

**Kiểm chứng test có răng:** cố ý đổi `pickup_radius + EPS` thành `+ 0.02` → `npm test` báo 1 fail (`pickup_boundary`) → hoàn tác.

**Token/chi phí (ước tính):** phiên Phase 1 khoảng 300k token đầu vào (phần lớn là ngữ cảnh đọc lại giữa các lượt gọi công cụ) và ~45k token đầu ra. Đây là ước tính thô, không phải số đo; xem số chính xác trong trang usage của tài khoản.
**Tiết kiệm:** không cài dependency (npm bị chặn → dùng Node strip-types, đỡ cả vòng debug bundler); viết scenario bằng một script sinh file; chạy test qua CLI thật thay vì nhờ AI "đọc" output; chỉ chụp màn hình khi cần bằng chứng hình ảnh; không đọc trước tab Phase 2.
