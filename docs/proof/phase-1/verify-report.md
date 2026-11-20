# Verify report — phase-1

Sinh tự động bởi `npm run verify` (tools/verify.ts). Không sửa tay. Chạy lại ở tag tương ứng sẽ ra cùng kết quả (trừ số ms).

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| npm test (unit + 32 scenario qua CLI) | ĐẠT | pass 38, fail 0 — xem test-output.txt |
| Tất định (seed 42 chạy 2 lần) | ĐẠT | sha256 cf4d5c28d093c40b = cf4d5c28d093c40b |
| Khác seed → khác output | ĐẠT | seed 43 df10bcca358c0e76 ≠ seed 42 4be278ffda4e90f4 |
| Chơi từ đầu tới thắng (bot, seed 42) | ĐẠT | end {"type":"end","ticks":7139,"state":"won","score":2031}, lantern_lit ×5 |
| Schema JSONL (snapshot 0,10,20…; end duy nhất ở cuối) | ĐẠT | 714 snapshot, 109 event |
| File inputs hỏng → mã 2 | ĐẠT | exit 2, stderr: lỗi: inputs: JSON không hợp lệ (Expected property name or '}' in JSON at position 1 (line 1 column 2)) |
| Tốc độ headless 18000 tick | ĐẠT | 422 ms (gồm khởi động Node) — 12th Gen Intel(R) Core(TM) i5-1240P, linux x64, Node 22.23.4 |

Dòng end của ván bot (seed 42): `{"type":"end","ticks":7139,"state":"won","score":2031}`
