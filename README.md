# Đảo Đèn Lồng — Day 12 AI SDLC (Nguyễn Công Tình · 2A202603373)

> **Video demo:** _(sẽ thêm ở Phase 4 — Release `v1.0.0`)_
> Tài liệu đề bài gốc: [`docs/lab/`](docs/lab/README.md)

Game 3D góc nhìn thứ ba: Mây — người giữ đèn nhỏ tuổi đội nón lá — gom đom đóm để thắp lại 5 Đèn Lồng Lớn trên **Đêm 1 – Đảo Bến**, né và xua Bóng Mực trong sương đen. Có chế độ **headless** theo **Test Contract v1.0** (`game.contract.json`).

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
| Kéo chuột trái, hoặc J/L | Xoay camera |
| Space | Nhảy |
| E | Nạp đom đóm vào đèn gần nhất (≤ 2.5 m) |
| Q hoặc F | Tỏa sáng: tốn 2 đom đóm, choáng + đẩy Bóng Mực trong 6 m |
| R | Chơi lại (bất kỳ lúc nào, kể cả sau thắng/thua) |

`?seed=123` trên URL để chơi một bản đồ cố định.

## Luật & cách tính điểm

Luật đầy đủ: [`docs/notes/assumptions-phase1.md`](docs/notes/assumptions-phase1.md). Tóm tắt:
- Đi gần đom đóm (≤ 1.5 m) thì tự nhặt, mang tối đa 10. Mỗi đèn cần 10 đom đóm.
- Bóng Mực xuất hiện từ giây 10, cứ 20 s thêm một con (tối đa 6), đuổi theo Mây. Bị chạm: mất 1 lửa, rơi một nửa số đom đóm đang mang, bất tử 1.5 s. Bóng Mực không vào được vùng 6 m quanh **đèn đã thắp**.
- **Thắng:** thắp đủ 5 đèn. **Thua:** hết 3 lửa, hoặc hết 300 s (trời sáng).

| Sự kiện | Điểm |
|---|---|
| Nhặt 1 đom đóm | +10 |
| Thắp 1 đèn | +100 |
| Mỗi Bóng Mực bị choáng | +20 |
| Khi thắng: mỗi giây còn lại (làm tròn xuống) | +1 |
| Khi thắng: mỗi lửa còn lại | +50 |

## Headless (Test Contract v1.0)

```bash
node src/headless/cli.ts --seed 1 --night 1 --ticks 600 --out out/run.jsonl \
     [--scenario s.json] [--inputs i.json] [--snapshot-every 10]
```
60 tick/giây cố định; lỗi file inputs/scenario → mã 2; lỗi tham số → mã 1. Ghi chú về tuning:
- `fall_enabled: false` — đảo có biên vô hình bán kính 40 m nên không thể rơi; không bao giờ phát `player_hit` với `by: "fall"`.
- Mọi số khác trong `tuning` là số game thật sự dùng (code đọc trực tiếp từ `game.contract.json`).

## Kiểm chứng

```bash
npm test                      # 6 unit test + 32 scenario headless (kỳ vọng tính tay từ luật)
PHASE=phase-1 npm run verify  # + tất định, schema, bot thắng, tốc độ → docs/proof/phase-1/verify-report.md
node tools/bot.ts --seed 42   # bot tự chơi, sinh file inputs thắng được
```
Bằng chứng & bảng truy vết: [`docs/proof/phase-1/traceability.md`](docs/proof/phase-1/traceability.md). CI (GitHub Actions) chạy build + test + verify trên Ubuntu/macOS, Node 22/24.

## Harness AI
`AGENTS.md` (+ `CLAUDE.md` trỏ tới), hook Stop chặn kết thúc khi `npm test` đỏ (`.claude/settings.json`), skill `.claude/skills/verify`, CI `.github/workflows/ci.yml`. Nhật ký: [`docs/notes/ai-log.md`](docs/notes/ai-log.md).

## Sáng tạo của tôi
- Vòng sáng hiển thị **vùng an toàn 6 m** quanh đèn đã thắp, vòng sóng khi tỏa sáng, đèn lồng sáng dần theo số đom đóm đã nạp, bầu trời/sương ấm dần theo số đèn đã thắp.
- **Bot tự chơi** (`tools/bot.ts`) dùng chính core để chứng minh Đêm 1 thắng được với nhiều seed.
- Các phần này chỉ ở lớp hiển thị/công cụ, **không đổi output headless** (bằng chứng: 32 scenario + tất định vẫn đạt, xem `verify-report.md`).

## Cấu trúc
`src/core` (luật, tất định, không DOM) · `src/headless` (CLI) · `src/render` (Three.js) · `web/` · `tools/` (serve, build, verify, bot) · `tests/` · `docs/notes` · `docs/proof`.
