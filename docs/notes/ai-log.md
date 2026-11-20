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

## Phase 2

**Cách làm:** lưu nguyên văn Ticket-02 (`docs/lab/ticket-02.txt`) → spec `assumptions-phase2.md` (bảng thay đổi so với P1, 23 giả định, acceptance criteria cho từng mục Phần 3) → contract v1.1 → viết lại core theo thứ tự tick 12 bước → sửa test P1 bằng tính tay + 25 scenario mới → render → verify → ghi chép → tag.

**Prompt chính:** "Tự truy cập đọc phase 2 và làm, luôn tuân thủ mọi yêu cầu kể cả trong thư mục gốc" (AI không đọc được lab board qua khung nhúng → người dùng dán nguyên văn ticket); "Hoàn thành hết phase 2 và nêu tôi cần thao tác gì".

**AI sai ở đâu & cách phát hiện:**
| Lỗi | Phát hiện bằng | Sửa / chỉnh harness |
|---|---|---|
| Kỳ vọng `p2_n3_wall` tính tay đúng nhưng code để Mây lọt qua vách do 10 + 20×0.1 = 11.9999… | Scenario đỏ, chạy CLI xem vị trí thật | Thêm sai số hình học 1e-9 cho ô sàn (sửa code, không sửa kỳ vọng); thêm luật vào AGENTS.md |
| Tháp chuông ở tâm Đêm 3 trùng điểm xuất phát (0,0,0) | Đọc lại bản đồ khi viết scenario | Giả định xuất phát Đêm 3 (0,0,−30), ghi §2.23 |
| Bản pause đầu tiên ở giao diện bỏ qua `sim.step` → trạng thái nút pause không reset, "Tiếp tục" không ăn | Tự review diff trước khi chạy | Luôn gọi `sim.step` (core tự đứng yên khi pause) |
| Bóng Mực tô tím toàn thân, lệch bảng màu (thân phải #120A1A, viền #7A3CFF) | Xem ảnh chụp trang chạy thử | Thân tối + vỏ viền BackSide |
| Đo "tốc độ 21 600 tick" ban đầu thực ra dừng sớm (Mây chết ~tick 1 700) | Đọc dòng end trong report | Đo bằng scenario không Bóng Mực, 360 s → đúng 21 600 tick |
| Lần "phá thử" bùa+lướt không làm test đỏ | Chạy phá thử | Không phải test yếu: code có 2 lớp bảo vệ trùng; gỡ cả 2 thì test đỏ |
| Lệnh gộp 4 lần `npm test` bị timeout 120 s, tưởng treo | Chạy lại từng phần | Ghi vào AGENTS.md: `npm test` ~35 s |
| Bot heuristic không thắng với số chuẩn | Chạy bot nhiều seed | Không tốn thêm token; ghi trung thực "chưa đạt" |

**Phá thử:** tâm pulse (bỏ +0.8) → `p2_pulse_3d` đỏ; bỏ luật "bấm khi đang lướt bị bỏ qua" → `p2_charm_dash` đỏ; gỡ hẳn hiệu ứng bùa lên lướt → `p2_charm_dash` đỏ.

**Token/chi phí (ước tính thô):** Phase 2 khoảng 600k token đầu vào (ngữ cảnh lớn + nhiều lượt gọi công cụ, ticket dài) và ~70k token đầu ra. Một lần in nhầm cả snapshot JSONL ra màn hình (~25k token lãng phí) — lần sau chỉ grep dòng event. Xem số chính xác ở trang usage.
**Tiết kiệm:** sinh 25 scenario bằng một script; tính tay theo công thức đóng (nhảy, rơi, bục) thay vì chạy thử; không cố tối ưu bot khi đã rõ không kịp giờ.
