# Đảo Đèn Lồng — Day 12 AI SDLC (Nguyễn Công Tình · 2A202603373)

> **Video demo:** _(sẽ thêm ở Phase 4 — Release `v1.0.0`)_
> Tài liệu đề bài gốc: [`docs/lab/`](docs/lab/README.md)

Game 3D góc nhìn thứ ba: Mây — người giữ đèn nhỏ tuổi đội nón lá — gom đom đóm để thắp lại các Đèn Lồng Lớn qua **3 Đêm** (Đảo Bến, Đảo Cau, Đảo Chuông), né và xua Bóng Mực, coi chừng Gió Lạc. Có chế độ **headless** theo **Test Contract v1.1** (`game.contract.json`, số liệu chuẩn Ticket-02).

## Cài đặt và chạy (Node ≥ 22.18, không cần `npm install`)

```bash
git clone <repo> && cd <repo>
npm run build      # kiểm tra Node + xuất bản web tĩnh dist/web
npm start          # mở http://localhost:5173 trong trình duyệt
```

Không có dependency npm: Node 22.18+ chạy TypeScript trực tiếp; Three.js 0.170 nạp từ CDN jsDelivr (cần Internet khi chơi bản có giao diện). Headless không cần mạng, cửa sổ hay GPU.

## Điều khiển

| Phím | Hành động |
|---|---|
| W/S hoặc ↑/↓, A/D | Đi (theo hướng camera) |
| Kéo chuột trái, hoặc J/L | Xoay camera (độ nhạy chỉnh trong Cài đặt) |
| Space | Nhảy |
| Shift | Lướt (14 m/s, 0.2 s, hồi 1.5 s) |
| E | Nạp đom đóm vào đèn gần nhất (≤ 2 m) |
| Q hoặc F | Tỏa Sáng: tốn 3 đom đóm, choáng + đẩy Bóng Mực trong 5 m, đuổi Gió Lạc |
| Esc hoặc P | Tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu |

Luồng: Menu → giới thiệu Đêm (lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → màn Bình Minh với tổng điểm; thua → chơi lại Đêm đó.
Tham số URL (`?` hoặc `#`): `seed=123` bản đồ cố định, `night=2` vào thẳng Đêm 2, `fps` hiện bộ đếm FPS.

## Luật & cách tính điểm

Luật đầy đủ: [`docs/notes/assumptions-phase1.md`](docs/notes/assumptions-phase1.md). Tóm tắt:
Luật Phase 2 (số chuẩn): [`docs/notes/assumptions-phase2.md`](docs/notes/assumptions-phase2.md). Tóm tắt:
- Đi gần đom đóm (≤ 1 m) thì tự nhặt, mang tối đa 10. Mỗi đèn cần 10, nạp nhiều lần được.
- Bóng Mực: 2 con ở giây 5, sau đó mỗi 8/7/6 s (Đêm 1/2/3); phát hiện 12 m, bỏ đuổi 18 m. Bị chạm: −1 Ngọn Lửa, rơi một nửa số đom đóm ra quanh Mây (nhặt lại được), bất tử 1.5 s. Không vào được vùng 6 m quanh đèn đã sáng.
- Rơi khỏi đảo: −1 Ngọn Lửa, mất hết đom đóm, hồi sinh sau 1 s. Gió Lạc (Đêm 2–3) cướp tối đa 3 đom đóm. Bùa Gió: chạy 7.2 m/s, lướt không hồi chiêu trong 10 s.
- **Thắng:** thắp đủ đèn. **Thua:** hết 3 Ngọn Lửa, hoặc hết giờ (300/330/360 s).

| Sự kiện | Điểm |
|---|---|
| Mỗi đom đóm **nạp** vào đèn | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực trúng Tỏa Sáng (mỗi con, mỗi lần) | +5 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +2 |
| Khi thắng: mỗi Ngọn Lửa còn lại | +50 |

Tổng điểm game = tổng điểm các Đêm đã thắng.

## Headless (Test Contract v1.0)

```bash
node src/headless/cli.ts --seed 1 --night 1 --ticks 600 --out out/run.jsonl \   # --night 1 | 2 | 3
     [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```
60 tick/giây cố định; lỗi file inputs/scenario → mã 2; lỗi tham số → mã 1. Mọi số trong `tuning` là số chuẩn Ticket-02 và là số game thật sự dùng (code đọc trực tiếp từ `game.contract.json`). Một Đêm đầy đủ 21 600 tick chạy ~2–4 s.

## Kiểm chứng

```bash
npm test                      # 7 unit test + 56 scenario headless (kỳ vọng tính tay từ luật), ~35 s
PHASE=phase-2 npm run verify  # + tất định 3 Đêm, schema v1.1, tốc độ 21 600 tick, bot → docs/proof/phase-2/verify-report.md
node tools/bot.ts --seed 5 --night 1   # bot tự chơi, sinh file inputs
```
Bằng chứng & bảng truy vết: [Phase 1](docs/proof/phase-1/traceability.md) · [Phase 2](docs/proof/phase-2/traceability.md). CI (GitHub Actions) chạy build + test + verify trên Ubuntu/macOS, Node 22/24.

## Harness AI
`AGENTS.md` (+ `CLAUDE.md` trỏ tới), hook Stop chặn kết thúc khi `npm test` đỏ (`.claude/settings.json`), skill `.claude/skills/verify`, CI `.github/workflows/ci.yml`. Nhật ký: [`docs/notes/ai-log.md`](docs/notes/ai-log.md).

## Sáng tạo của tôi
- Vòng sáng hiển thị **vùng an toàn 6 m** quanh đèn đã thắp, vòng sóng khi tỏa sáng, đèn lồng sáng dần theo số đom đóm đã nạp, bầu trời/sương ấm dần theo số đèn đã thắp.
- **Bot tự chơi** (`tools/bot.ts`) dùng chính core: nhặt, nạp, tỏa sáng, lướt né; sinh file inputs phát lại được qua headless.
- Âm thanh tổng hợp hoàn toàn bằng WebAudio (không file asset), lời dẫn của Ông Đăng cho từng Đêm, dải báo lỗi JS ngay trên trang.
- Các phần này chỉ ở lớp hiển thị/công cụ, **không đổi output headless** (bằng chứng: 32 scenario + tất định vẫn đạt, xem `verify-report.md`).

## Cấu trúc
`src/core` (luật, tất định, không DOM) · `src/headless` (CLI) · `src/render` (Three.js) · `web/` · `tools/` (serve, build, verify, bot) · `tests/` · `docs/notes` · `docs/proof`.
