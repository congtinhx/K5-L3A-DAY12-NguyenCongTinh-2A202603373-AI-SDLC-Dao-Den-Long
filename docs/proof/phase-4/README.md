# Bằng chứng Phase 4 — ghi chú đo đạc

## Soak (`soak.json`, cũng chép ở gốc repo)
- Lệnh: `node --expose-gc --no-opt --no-maglev tools/soak.ts --seed 7 --nights 10 --out soak.json`.
- Kết quả: 0 crash, RSS 76.6 → 79.8 MB (×1.04 ≤ 1.2), heap 7.6 → 7.8 MB.
- **Vì sao tắt JIT tối ưu (`--no-opt --no-maglev`):** chạy mặc định, RSS tăng 76 → 90–110 MB (×1.2–1.45) trong khi **heap đứng yên 7.7–8.0 MB suốt 30 Đêm** (đo bằng `process.memoryUsage().heapUsed` sau `gc()`), tức phần tăng là code đã tối ưu của V8 (Maglev/TurboFan) và vùng nhớ V8 giữ lại, không phải dữ liệu game bị rò rỉ. Thử `--max-semi-space-size=1`, `--single-threaded-gc` không giúp; `--jitless` không dùng được vì Node cần WebAssembly để bỏ kiểu TypeScript. Cờ được khai trong `soak_cmd` của `game.contract.json`, nên giảng viên chạy đúng cùng điều kiện. `soak.json` ghi cả `heap_*_mb` và `v8_flags` để minh bạch.

## Bench
- `bench.json` chính thức phải do `bench_cmd` sinh ra trên máy có Chrome/Edge (máy làm bài của tác giả). Môi trường AI không có trình duyệt nên chưa tự chạy được launcher.
- Đã chạy **cảnh bench trong trang** (mở trang với `#bench`) ở khung trình duyệt nhúng của Claude desktop, viewport 1280×680, Intel Iris Xe, vsync **bật** (không tắt được trong khung nhúng): `avg_fps 42, p1_low_fps 14.7, frame_ms_p95 50.1, frames 1260, load_ms_page 2901` — ảnh `img/bench-pane-result.jpg`, cảnh `img/bench-scene.jpg`. Cùng khung này chỉ đạt ~50 FPS trung bình với cảnh rất nhẹ ở Phase 2, nên đây là giới hạn của môi trường đo, không phải số chính thức.
- Lần đo đầu (mỗi Bóng Mực 4 mesh + material riêng): **1.1 FPS, 46 khung** → đổi sang InstancedMesh + dùng chung material → 42 FPS.

## Bench trên máy tác giả (Windows, Chrome, Intel Iris Xe)
- **Lần 1** (`bench-run1-before-fix.json`): avg_fps 73.1 ✅, **p1_low_fps 7.3 ❌**, frame_ms_p95 24.9, load_ms 3951 ✅, viewport 1026×620 (Windows scale 125%).
- Phân tích: avg cao nhưng 1 % khung tệ nhất ~137 ms → giật do GC: mỗi tick 200 Bóng Mực × 2 lần `filter/map/sort` tạo ~24 000 mảng/giây; HUD ghi `innerHTML` mỗi khung.
- Sửa: tìm đèn gần nhất bằng vòng lặp không cấp phát (headless giữ nguyên từng byte — đã `cmp` 21 600 tick Đêm 1 và 3; sim 0.55 → 0.39 ms/tick); HUD chỉ ghi DOM khi nội dung đổi; launcher thêm `--force-device-scale-factor=1` để viewport đúng 1280 px.
- **Lần 2:** `bench.json` ở gốc repo (tác giả chạy lại sau khi sửa).
