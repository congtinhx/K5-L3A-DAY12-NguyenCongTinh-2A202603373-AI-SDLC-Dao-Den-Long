# Retro — Đảo Đèn Lồng (Day 12 AI SDLC)

## 1. Tổng hợp 4 phase
| Phase | Kết quả chính | Chưa đạt / rủi ro |
|---|---|---|
| 1 — PRD-0 | Đêm 1 chơi được; headless v1.0; 32 scenario tính tay; tất định; bot thắng | Trợ giảng không truy cập được từ khung nhúng → giả định tự đặt |
| 2 — Ba hòn đảo | Số chuẩn, 3 bản đồ, lướt/rơi/Gió Lạc/Bùa Gió/pause/gió; v1.1; 25 scenario mới; UI đầy đủ; ≥ 30 FPS | Bot không thắng với số chuẩn; thiếu ảnh vài màn |
| 3 — Đèn cạn dầu | Đèn có nhiên liệu (số nguyên 1/60), drain, luật thắng bình minh; ADR-0001; CHANGELOG; 18 scenario mới | "Đèn đầy" không tới được bằng input; ảnh UI Phase 3 thiếu |
| 4 — Bình minh | Bench (cảnh chuẩn + launcher), soak (0 crash, ×1.04), bảng xếp hạng lưu đĩa + export, tiếp cận, v1.3 | `bench.json` chính thức cần chạy trên máy có Chrome; số FPS trong khung nhúng 42 (vsync bật) |

Số liệu cuối: 11 unit test + 73 scenario headless (tất cả tính tay từ luật), verify 3 Đêm tất định, 21 600 tick ≈ 1.5–3.5 s, soak 10 Đêm 1.9 s.

## 2. Điều hiệu quả khi làm với AI
- **Viết luật + scenario tính tay trước khi code.** Đa số scenario đạt ngay lần chạy đầu; những lần đỏ đều chỉ ra lỗi thật (sai số dấu phẩy động ở vách tầng, lỗi tầm nhìn biến khi chèn code).
- **"Phá thử" test** (cố ý làm sai code) phát hiện được test yếu (Phase 1) và code có bảo vệ trùng (Phase 2).
- **Patch có kiểm tra "chuỗi khớp đúng 1 lần"** khi sửa core ở Phase 3–4: sửa lớn trong một lượt mà không sửa nhầm chỗ.
- **Không dependency** (Node strip-types + CDN): không mất thời gian với bundler hay npm bị chặn.
- **Dải báo lỗi JS trên trang**: thay cho console không đọc được trong khung nhúng; bắt ngay lỗi `moteCoreMat` ở Phase 4.

## 3. Điều không hiệu quả
- Đọc lab board/trợ giảng qua khung trình duyệt nhúng thất bại (iframe khác domain) → người dùng phải dán ticket.
- Đo hình ảnh/FPS trong khung nhúng không ổn định (trang trắng, treo, vsync không tắt được) → tốn nhiều lượt chờ.
- Bot heuristic: tốn thời gian ở Phase 2 mà vẫn không thắng với số chuẩn.

## 4. Những lần AI sai và cách phát hiện
| Lỗi | Phát hiện | Khắc phục / harness |
|---|---|---|
| Test luôn đạt (`interact_edge_only`) | Rà kỳ vọng | Viết lại; AGENTS.md: luật "phá thử" |
| Cú pháp TS không strip được (parameter property) | Tự rà | AGENTS.md: chỉ cú pháp xóa được |
| Mây lọt vách tầng do 11.9999… | Scenario đỏ | Sai số hình học 1e-9; AGENTS.md |
| Pause UI không reset trạng thái nút | Review diff | Luôn gọi `sim.step` |
| Đo "21 600 tick" thực ra dừng sớm | Đọc dòng end | Scenario không Bóng Mực, 360 s |
| Mô tả scenario sai với điều nó kiểm (`p3_refuel_*`) | Đọc lại sau khi đạt | Đổi tên, ghi giới hạn |
| Bench 1.1 FPS do ~800 material riêng | Chạy cảnh bench | InstancedMesh + material dùng chung → 42 FPS |
| Biến dùng trước khai báo sau khi chèn code | Dải báo lỗi trên trang | Sắp lại khai báo |
| `??` không bắt chuỗi rỗng ở biến môi trường | Lệnh export ra 0 mục | Dùng `||` |
| Gộp nhiều `npm test` trong 1 lệnh → timeout tưởng treo | Chạy lại từng phần | AGENTS.md: `npm test` ~45 s |

## 5. Harness nào giúp nhiều nhất
1. **Scenario JSON + runner chạy CLI thật** — bằng chứng, regression và đặc tả trong một.
2. **`npm run verify` / skill verify** — sinh report không sửa tay, kiểm tất định + schema + tốc độ mỗi phase.
3. **AGENTS.md** — nơi đóng các lỗi lặp lại (cú pháp, sai số, thứ tự tick, tên trạng thái, quy trình ADR/CHANGELOG).
4. Hook Stop (chặn kết thúc khi test đỏ) và CI — lưới an toàn; ít khi kích hoạt vì test đã chạy thủ công trước mỗi commit.

## 6. Token / chi phí (ước tính thô — số chính xác xem trang usage)
| Phase | Đầu vào | Đầu ra | Ghi chú |
|---|---|---|---|
| 1 | ~300k | ~45k | đọc đề, scenario, core, UI |
| 2 | ~600k | ~70k | ticket dài; 1 lần in nhầm cả JSONL (~25k lãng phí) |
| 3 | ~250k | ~35k | patch một lượt |
| 4 | ~550k | ~60k | nhiều lượt chờ/chụp khung trình duyệt |
| **Tổng** | **~1.7M** | **~210k** | |

Cách tiết kiệm: sinh scenario bằng script; tính tay theo công thức đóng thay vì chạy thử; patch có kiểm tra; chỉ grep dòng event thay vì in snapshot; dừng tối ưu bot khi không còn giá trị.

## 7. Nếu làm lại
- Thiết kế render theo InstancedMesh ngay từ Phase 1 (biết trước sẽ có nhiều thực thể).
- Vendor Three.js vào repo từ đầu để chạy offline và load nhanh.
- Viết runner scenario chạy song song (hiện ~45 s vì mỗi scenario khởi động Node).
- Chuẩn bị máy/trình duyệt thật để đo FPS, không phụ thuộc khung nhúng.
- Hỏi trợ giảng sớm qua claude.ai trên trình duyệt thường.
