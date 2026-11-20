# Spec Phase 2 — Ticket-02 "Ba hòn đảo" (Contract v1.1)

> Nguồn: `docs/lab/ticket-02.txt` (nguyên văn). File này **thay** các số/luật tự chọn ở `assumptions-phase1.md` khi hai bên khác nhau; phần Phase 1 không bị nhắc lại vẫn giữ. Số tuning đọc từ `game.contract.json` (đã khớp Phần 1 của ticket). Ký hiệu `t` = tick, `st` = sim_tick (đứng yên khi tạm dừng).

## 1. Thay đổi so với Phase 1 (và lý do)
| Mục | Phase 1 (tự chọn) | Phase 2 (chuẩn) |
|---|---|---|
| pickup | 1.5 m XZ | 1.0 m XZ **và** chênh cao ≤ 1.5 m |
| interact | 2.5 m | 2.0 m |
| pulse | 2 đom đóm / 6 m XZ / 1 s / choáng 180 / đẩy tức thì 4 m | 3 / 5 m **3D** từ chân+0.8 / 3 s / choáng 120 / đẩy 4 m trong 15 tick |
| shade | 3.5 m/s, luôn đuổi, sinh tick 600 + 1200k | 4.0 (Đêm 3: 4.5), phát hiện 12/bỏ 18, 2 con tick 300 rồi mỗi 480/420/360 |
| nhảy | 6 m/s | 7 m/s |
| rơi | không (biên vô hình) | có: Y < −10 |
| điểm | +10 khi **nhặt**, stun +20, giây ×1 | +10 mỗi đom đóm **nạp**, +5 mỗi Bóng Mực trúng pulse, giây ×2 |
| đom đóm mặc định | 60 rải ngẫu nhiên | 20 tại 20 điểm sinh chuẩn, +1 mỗi 240 tick (trần 30) |
| đom đóm rơi khi bị đánh | biến mất | rơi ra vành 1.5–2.5 m, sống 480 tick |
| đèn Đêm 1 | 25·(sin, cos) | toạ độ chuẩn ghi trong ticket (L2 = (23.8,0,7.7)…) |

## 2. Giả định cho chỗ ticket chưa nói rõ
1. **Tăng tốc:** vận tốc ngang đổi tức thì (0 tick ≤ 0.1 s). `vel` = vận tốc của tick vừa chạy (m/s).
2. **Hướng quay mặt:** ban đầu +Z; cập nhật thành hướng di chuyển mỗi khi có input di chuyển. Hồi sinh → +Z.
3. **Lướt:** bắt đầu trong bước di chuyển của tick nhấn, chạy đúng 12 tick (2.8 m); trong lúc lướt vy = 0 và không có trọng lực; ghi event `dash` ở tick bắt đầu. Đang bị bục bắn: lướt thay vận tốc ngang trong 12 tick rồi trở lại vận tốc bục.
4. **Va chạm địa hình:** mỗi ô sàn là khối đặc tới đáy. Bước lên được chênh ≤ 0.25 m (dốc), cao hơn là vách → chặn (trượt theo từng trục). Tháp chuông = khối cao 14 m. Đi ra khỏi mép thì rơi tự do.
5. **Bóng Mực "spawning":** 60 tick đứng yên, không gây hit, rồi `wander`. Bóng Mực trong scenario mặc định `wander` (hoạt động ngay; phát hiện người chơi ≤ 12 m thì `chase` ngay bước đó).
6. **Wander:** 1.5 m/s tới một điểm sinh đom đóm ngẫu nhiên (theo seed), tới nơi thì chọn điểm mới.
7. **Khoảng cách phát hiện/bỏ đuổi, chạm:** đo XZ (chạm thêm chênh cao |y_Mây − y_tâm Bóng Mực| ≤ 1.5).
8. **Độ cao Bóng Mực:** lơ lửng cố định trên mặt sàn cao nhất tại XZ của nó (sinh mới: +1.0 m; trong scenario: giữ độ chênh ban đầu).
9. **Vật cản của Bóng Mực:** mép vùng an toàn đèn đã sáng và tháp chuông. Không bị vách tầng chặn (sinh vật sương).
10. **Đẩy ra khỏi vùng an toàn:** khi đèn vừa sáng, Bóng Mực trong vùng đi thẳng ra mép trong đúng 30 tick, không gây hit, không tự di chuyển trong lúc đó (trạng thái giữ nguyên tên).
11. **Recoil:** sau khi gây hit, lùi 2 m theo hướng ra xa Mây trong 60 tick (2/60 m mỗi tick), rồi `wander`.
12. **Điểm sinh Bóng Mực hợp lệ:** cách Mây ≥ 15 m XZ và không nằm trong vùng an toàn; chọn ngẫu nhiên theo seed. Đếm tối đa theo số Bóng Mực đang có.
13. **Trần 30 đom đóm** tính mọi đom đóm đang có (cả loại rơi). "Điểm trống" = điểm sinh không có đom đóm random nào đứng đúng ở đó.
14. **Đom đóm rơi** đặt trên mặt sàn tại điểm rơi; nếu điểm đó không có sàn thì đặt ở độ cao chân Mây. Chỉ nhặt từ tick sau.
15. **Rơi khỏi đảo:** event `player_hit {by:"fall", flames, dropped:0, lost}`; trong 60 tick chờ: Mây đứng yên ngoài bản đồ, không nhặt/không bị chạm/không bị cướp/không tương tác/không pulse.
16. **Gió Lạc:** bay ở +1.5 m trên mặt sàn; idle lượn 2 m/s tới điểm sinh ngẫu nhiên; chạm cướp được cả khi idle (miễn đang mang > 0); flee 240 tick rồi `removed` (vẫn hiện trong snapshot với state `removed`). Bị pulse khi flee có đồ: thả đồ tại chỗ (đom đóm rơi), `drifter_drop`, biến mất sau 120 tick. Trúng pulse dùng cùng luật 3D 5 m.
17. **Bùa Gió:** nhặt khi XZ ≤ 1.0 và chênh cao ≤ 1.5; respawn đếm 2700 tick kể từ lúc nhặt.
18. **Gió mạnh (Đêm 3):** cơn gió bắt đầu ở st = 1800, 3600, … kéo dài 300 tick, hướng ngẫu nhiên theo seed (dir_deg từ +X, ngược kim đồng hồ). Cộng 2 m/s vào vận tốc ngang (cả khi đang lướt/bị bắn). Báo trước 2 s chỉ ở bản có giao diện.
19. **Tạm dừng:** cạnh lên của `pause` bật/tắt. Tick bật tạm dừng dừng ngay sau bước đọc input. Tick bỏ tạm dừng chạy đủ bước. Các nút khác vẫn cập nhật trạng thái "trước" trong lúc dừng (bấm trong lúc dừng không kích hoạt sau khi tiếp tục).
20. **Event `night_start {night}`** ghi với tick 0 ngay sau snapshot tick 0.
21. **Snapshot:** `player.invuln` là boolean; `*_cd_s`, `charm_s`, `ttl_s`, `respawn_s` là giây còn lại (làm tròn 3 số); `ttl_s` = null với đom đóm random.
23. **Xuất phát Đêm 3:** (0,0,−30) trên tầng 0, quay mặt +Z — vì (0,0,0) nằm trong tháp chuông. Đêm 2 xuất phát (0,0,0) tâm đảo A.
22. **Tổng điểm game** = tổng các Đêm đã thắng (bản giao diện). Headless chạy 1 Đêm nên `score` là điểm của Đêm đó (cộng thưởng khi thắng).

## 3. Thứ tự tick (theo ticket, bắt buộc)
1. Input (pause trước) → 2. giảm bộ đếm (thời gian, hồi chiêu, bất tử, choáng, bùa, TTL, hồi bùa, chờ hồi sinh, gió) → 3. di chuyển Mây (nhảy, lướt, bục, gió) + kiểm tra rơi → 4. nhặt đom đóm, bùa → 5. đèn → 6. vùng an toàn → 7. Tỏa Sáng → 8. Bóng Mực, Gió Lạc → 9. chạm (Gió Lạc trước, Bóng Mực theo id tăng) → 10. sinh đom đóm/Bóng Mực/Gió Lạc → 11. thắng/thua → 12. snapshot.

## 4. Acceptance criteria — Phần 3 (tính năng mới)
| ID | Tiêu chí (làm A thì thấy B) | Kiểm chứng |
|---|---|---|
| AC-DASH-1 | Nhấn dash khi đứng yên quay mặt +Z → đi 2.8 m theo +Z trong 12 tick, event `dash` | scenario `p2_dash_basic` |
| AC-DASH-2 | Nhấn lại trước 90 tick → không lướt; ở tick 90 → lướt | `p2_dash_cooldown` |
| AC-DASH-3 | Lướt trên không giữ nguyên độ cao | `p2_dash_air` |
| AC-FALL-1 | Đi ra khỏi đảo Đêm 1 → `player_hit` by fall với `lost`, −1 lửa, 60 tick sau hồi sinh ở (0,0,0) bất tử | `p2_fall_respawn` |
| AC-FALL-2 | Rơi khi còn 1 lửa → thua `no_flames`, không hồi sinh | `p2_fall_last_flame` |
| AC-DRIFT-1 | Mang ≥ 5, Gió Lạc ≤ 15 m → `chase`; chạm → cướp min(3, mang), `drifter_steal`, `flee`, 240 tick sau `removed` | `p2_drifter_steal` |
| AC-DRIFT-2 | Pulse trúng Gió Lạc đang chase → flee, không cướp | `p2_drifter_pulse_chase` |
| AC-DRIFT-3 | Pulse trúng Gió Lạc đang flee có đồ → `drifter_drop`, đom đóm rơi nhặt lại được | `p2_drifter_pulse_drop` |
| AC-DRIFT-4 | Gió Lạc sinh ở tick 1200 Đêm 2, id D1 | `p2_drifter_spawn` |
| AC-CHARM-1 | Nhặt Bùa Gió → `charm_picked {C1, 600}`, chạy 7.2 m/s | `p2_charm_speed` |
| AC-CHARM-2 | Có bùa: lướt liên tiếp không hồi chiêu (cần nhấn lại) | `p2_charm_dash` |
| AC-CHARM-3 | Bùa xuất hiện lại sau 2700 tick | `p2_charm_respawn` |
| AC-NIGHT-1 | `--night 2/3` dựng đúng đèn, thời lượng 330/360, `night_start` | `p2_night2_start`, `p2_night3_start` |
| AC-NIGHT-2 | Bục nhảy Đêm 2 đưa Mây sang đảo kia | `p2_launch_pad` |
| AC-NIGHT-3 | Đêm 3: vách tầng chặn, dốc đi lên tầng 1 được, bục (0,3,13) đưa lên tầng 2 | `p2_n3_wall`, `p2_n3_ramp`, `p2_n3_pad` |
| AC-NIGHT-4 | Gió Đêm 3 hoạt động ở st 1800, đẩy 2 m/s | `p2_wind` |
| AC-PAUSE-1 | Pause → `paused`, tick tăng, sim_tick/thời gian đứng yên, state `paused`; pause lại → `resumed` | `p2_pause` |
| AC-UI-1 | Menu → giới thiệu Đêm (tên đảo, lời Ông Đăng) → chơi → kết quả → Đêm kế; thắng Đêm 3 → Bình Minh + tổng điểm; thua → chơi lại Đêm | ảnh chụp |
| AC-UI-2 | Esc/P mở menu tạm dừng: Tiếp tục / Chơi lại Đêm / Cài đặt / Về menu; logic đứng yên | ảnh + core `p2_pause` |
| AC-UI-3 | Cài đặt âm lượng + độ nhạy chuột lưu qua localStorage | ảnh, mở lại trang |
| AC-UI-4 | Âm thanh cho 10 loại sự kiện + nhạc nền (WebAudio tổng hợp) | code + video |
| AC-UI-5 | HUD đúng vị trí ticket; đồng hồ đỏ nhấp nháy ≤ 30 s; nhắc "E — Nạp ánh sáng (x/10)"; mũi tên tới đèn gần nhất ngoài màn hình | ảnh |
| AC-UI-6 | Bảng màu chuẩn, ánh sáng môi trường = 0.15 + 0.55 × tiến độ | code (hằng số màu) + ảnh |
| AC-PERF-1 | Headless 21 600 tick ≤ 30 s | verify-report |
| AC-PERF-2 | ≥ 30 FPS trung bình ở 1280×720 | đo bằng `?fps=1` |
