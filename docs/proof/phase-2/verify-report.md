# Verify report — phase-2

Sinh tự động bởi `npm run verify` (tools/verify.ts). Không sửa tay. Chạy lại ở tag tương ứng sẽ ra cùng kết quả (trừ số ms).
Máy: 12th Gen Intel(R) Core(TM) i5-1240P, linux x64, Node 22.23.4.

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| npm test (unit + scenario headless qua CLI) | ĐẠT | pass 63, fail 0 — xem test-output.txt |
| Đêm 1: tất định (seed 42 × 2) | ĐẠT | sha256 bd31080f47ebed18 = bd31080f47ebed18 |
| Đêm 1: khác seed → khác output | ĐẠT | seed 43 b038264751c1a64b |
| Đêm 1: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 1480 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 1: schema JSONL v1.1 | ĐẠT | 174 snapshot, 9 event, kết thúc {"type":"end","ticks":1731,"state":"lost","score":0} |
| Đêm 2: tất định (seed 42 × 2) | ĐẠT | sha256 930683a6b34485fa = 930683a6b34485fa |
| Đêm 2: khác seed → khác output | ĐẠT | seed 43 81605d31b7f7b355 |
| Đêm 2: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 4643 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 2: schema JSONL v1.1 | ĐẠT | 140 snapshot, 9 event, kết thúc {"type":"end","ticks":1399,"state":"lost","score":0} |
| Đêm 3: tất định (seed 42 × 2) | ĐẠT | sha256 ed3849aa3d584c6b = ed3849aa3d584c6b |
| Đêm 3: khác seed → khác output | ĐẠT | seed 43 1f419c4f538b0f72 |
| Đêm 3: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 2530 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 3: schema JSONL v1.1 | ĐẠT | 219 snapshot, 12 event, kết thúc {"type":"end","ticks":2182,"state":"lost","score":0} |
| Bot tự chơi Đêm 1 (seed 5) tới hết Đêm, phát lại qua CLI | ĐẠT | end {"type":"end","ticks":18000,"state":"lost","score":715}; đèn thắp ×3. Bot đơn giản **chưa thắng** với số chuẩn (xem eval-phase2.md) |
| File inputs hỏng → mã 2 | ĐẠT | exit 2 |
| --night 4 → lỗi (mã ≠ 0) | ĐẠT | exit 1 |
