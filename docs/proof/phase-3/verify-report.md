# Verify report — phase-3

Sinh tự động bởi `npm run verify` (tools/verify.ts). Không sửa tay. Chạy lại ở tag tương ứng sẽ ra cùng kết quả (trừ số ms).
Máy: 12th Gen Intel(R) Core(TM) i5-1240P, linux x64, Node 22.23.4.

| Kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| npm test (unit + scenario headless qua CLI) | ĐẠT | pass 80, fail 0 — xem test-output.txt |
| Đêm 1: tất định (seed 42 × 2) | ĐẠT | sha256 4e7d2399963931a9 = 4e7d2399963931a9 |
| Đêm 1: khác seed → khác output | ĐẠT | seed 43 58c4091107d9765d |
| Đêm 1: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 2708 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 1: schema JSONL v1.2 | ĐẠT | 1441 snapshot, 8 event, kết thúc {"type":"end","ticks":14400,"state":"lost","score":0} |
| Đêm 2: tất định (seed 42 × 2) | ĐẠT | sha256 14abaf16d09352cc = 14abaf16d09352cc |
| Đêm 2: khác seed → khác output | ĐẠT | seed 43 424fdfe3a612e5bc |
| Đêm 2: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 1935 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 2: schema JSONL v1.2 | ĐẠT | 1621 snapshot, 10 event, kết thúc {"type":"end","ticks":16200,"state":"lost","score":0} |
| Đêm 3: tất định (seed 42 × 2) | ĐẠT | sha256 d6e89b9c5d40fa15 = d6e89b9c5d40fa15 |
| Đêm 3: khác seed → khác output | ĐẠT | seed 43 a9d7b5b7199e7fa1 |
| Đêm 3: tốc độ ≤ 30 s cho 21 600 tick | ĐẠT | 1444 ms gồm khởi động Node; end {"type":"end","ticks":21600,"state":"lost","score":0} |
| Đêm 3: schema JSONL v1.2 | ĐẠT | 1139 snapshot, 15 event, kết thúc {"type":"end","ticks":11387,"state":"lost","score":0} |
| Bot tự chơi Đêm 1 (seed 5) tới hết Đêm, phát lại qua CLI | ĐẠT | end {"type":"end","ticks":2542,"state":"lost","score":30}; đèn thắp ×0. Bot đơn giản chưa châm dầu/chưa thắng (xem eval) |
| File inputs hỏng → mã 2 | ĐẠT | exit 2 |
| --night 4 → lỗi (mã ≠ 0) | ĐẠT | exit 1 |
