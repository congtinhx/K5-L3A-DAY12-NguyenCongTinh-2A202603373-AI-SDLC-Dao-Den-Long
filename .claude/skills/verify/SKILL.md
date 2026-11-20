---
name: verify
description: Chạy kiểm chứng Đảo Đèn Lồng (unit + scenario headless + tất định) và lưu bằng chứng vào docs/proof. Dùng trước khi báo "xong", trước khi gắn tag phase-N, hoặc khi người dùng hỏi game có đúng contract không.
---

# Verify

1. `npm test` — nếu đỏ: đọc assertion lỗi, sửa **code** (không sửa kỳ vọng trong `tests/scenarios`), chạy lại.
2. `PHASE=phase-N npm run verify` — chạy toàn bộ test; với **mỗi Đêm 1–3**: seed 42 hai lần so từng byte, seed 43 phải khác, schema JSONL v1.1 (night, wind, player.vel/grounded/invuln/*_cd_s, motes kind/ttl_s, drifters, charms, tên trạng thái), Đêm đầy đủ 21 600 tick ≤ 30 s; bot tự chơi phát lại qua CLI; ghi `docs/proof/<PHASE>/verify-report.md` + `test-output.txt`. Chạy với timeout ≥ 180 s.
3. Mở `docs/proof/<PHASE>/verify-report.md`, đối chiếu từng dòng của `traceability.md`: cột Kết quả chỉ ghi "Đạt" khi có bằng chứng tương ứng; còn lại ghi "Chưa đạt" + lý do.
4. Yêu cầu chỉ thấy bằng mắt (menu, HUD, tạm dừng, bảng màu, FPS): `npm run build`, mở bản web (hoặc trang chạy thử) với `#fps`, khung 1280×720; chụp ảnh vào `docs/proof/<PHASE>/img/` kèm chú thích yêu cầu nào. Nếu trang trắng: đợi CDN tải xong; lỗi JS hiện ở dải đỏ đầu trang.
5. Không commit nếu bước 1–2 đỏ.
