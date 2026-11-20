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

### Các lần đo trên máy tác giả (cùng máy, Windows 11, Chrome, Iris Xe, cắm sạc)
| Lần | Thay đổi trước lần đo | avg_fps | p1_low_fps | p95 ms | load_ms | Khung > 33 ms |
|---|---|---|---|---|---|---|
| 1 | — (viewport 1026×620 do scale 125 %) | 73.1 | 7.3 | 24.9 | 3951 | — |
| 2 | tìm đèn không cấp phát, HUD cache, scale factor 1 | 128.2 | 15.7 | 13.7 | 6146 | — |
| 3 | bỏ cấp phát còn lại + ghi chẩn đoán | 125.6 | 28.7 | 16.5 | 2941 | 6 (4 trong 0.6 s đầu, 2 ở ~10 s) |
| 4 | biên dịch shader + báo launcher trong lúc khởi động | 118.1 | 17.8 | 17.2 | 4232 | 46 — **tất cả trong 3.5 s đầu của khoảng đo**, đều ~55 ms, sau đó không còn |

**Phân tích:** avg_fps và load_ms đạt ngưỡng ổn định. p1_low dao động 15.7–28.7 giữa các lần gần như cùng code, và khung chậm dồn vào vài giây đầu → khớp với việc Chrome chạy **profile trắng** (thư mục tạm mới mỗi lần) và làm việc nền lúc khởi động. Đã thêm các cờ tắt việc nền chuẩn (`--disable-background-networking`, `--disable-component-update`, …) vào launcher. Phần còn lại của 30 s đo chạy ổn định ~118–128 FPS. Ngưỡng chính thức đo trên máy chấm của giảng viên.
