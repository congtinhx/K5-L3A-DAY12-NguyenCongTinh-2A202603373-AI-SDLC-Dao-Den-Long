# Giả định & luật chi tiết — Phase 1 (PRD-0, Test Contract v1.0)

> Nguồn sự thật cho luật game. Code trong `src/core/` phải làm đúng file này; số tuning đọc trực tiếp từ `game.contract.json` (không khai báo hai nơi).
> Ký hiệu: `t` = tick hiện tại = k+1 khi đang chạy bước k. "Trong bán kính r" = khoảng cách XZ ≤ r + 1e-9 (sai số dấu phẩy động).

## 1. Số tuning (khai báo trong `game.contract.json`)

| Key | Giá trị | Ý nghĩa trong game của tôi |
|---|---|---|
| player_speed | 6 | m/s ⇒ 0.1 m/tick |
| carry_capacity | 10 | số đom đóm mang tối đa |
| lantern_cost | 10 | số đom đóm cần nạp để thắp 1 đèn |
| lantern_count_night1 | 5 | L1…L5 |
| pickup_radius | 1.5 | nhặt **tự động** |
| interact_radius | 2.5 | bấm interact để nạp vào đèn |
| pulse_cost | 2 | tỏa sáng tốn **2 đom đóm đang mang** |
| pulse_radius | 6 | |
| night1_duration_s | 300 | hết giờ = bình minh = thua |
| flames | 3 | "máu" của Mây |
| invuln_s | 1.5 | 90 tick bất tử sau khi bị chạm |
| hit_drop_ratio | 0.5 | rơi `floor(carried × 0.5)`; đom đóm rơi biến mất |
| pulse_stun_s | 3 | 180 tick |
| pulse_push_m | 4 | |
| pulse_cooldown_s | 1 | 60 tick |
| safe_radius | 6 | quanh **đèn đã thắp** |
| shade_speed | 3.5 | m/s ⇒ 0.058333 m/tick (chậm hơn Mây) |
| shade_hit_radius | 1.0 | |
| fall_enabled | false | đảo có biên vô hình bán kính 40 m, không rơi được ⇒ không bao giờ có `player_hit` với `by: "fall"` |
| score | mote 10, lantern 100, stun 20, second_left 1, flame_left 50 | |

Giây → tick: `round(s × 60)`.

## 2. Thế giới mặc định (Đêm 1 – Đảo Bến)
- Đảo tròn tâm (0,0,0), bán kính **40 m**. Người chơi bị kẹp trong bán kính 40 (XZ).
- Đèn `Li` (i=1..5) trên vòng bán kính 25, góc a=(i−1)·72°: `pos = (25·sin a, 0, 25·cos a)` ⇒ L1 = (0,0,25).
- Đom đóm (`random_motes` mặc định true): 60 con `M1…M60`, vị trí ngẫu nhiên theo seed, bán kính 3–38 m. Khi số đom đóm còn lại < 20 thì cứ 3 s sinh thêm 1 con (id tiếp tục M61…). Không có event cho việc sinh đom đóm.
- Bóng Mực (`random_shades` mặc định true): ban đầu 0 con. Sinh ở tick 600, 1800, 3000… (mỗi 20 s, bắt đầu 10 s), tối đa 6 con cùng lúc; vị trí trên vòng bán kính 38, góc ngẫu nhiên theo seed (thử tối đa 10 lần để cách người chơi ≥ 15 m). Phát event `shade_spawned`. Id `S<n>` tăng dần, tiếp nối sau id lớn nhất đã có.
- Bóng Mực mới sinh có y = 1.0 (tâm lơ lửng); Bóng Mực do scenario đặt giữ nguyên y được cho.
- Một RNG duy nhất (mulberry32, seed = `--seed`), mọi bốc ngẫu nhiên đi qua nó theo thứ tự cố định ⇒ tất định.

## 3. Luật
1. **Di chuyển:** move [x,z] (chuẩn hóa nếu dài > 1) xoay theo cam_yaw đúng công thức contract, nhân `player_speed/60`. Kẹp trong đảo.
2. **Nhảy:** cạnh false→true khi đang đứng đất (y=0) ⇒ vy = 6 m/s; trọng lực 20 m/s². Nhảy **không** né được Bóng Mực và không ảnh hưởng nhặt (mọi khoảng cách tính trên XZ).
3. **Nhặt:** mỗi tick, các đom đóm trong `pickup_radius`, xếp theo khoảng cách rồi theo id, được nhặt lần lượt tới khi `carried = carry_capacity`. Mỗi con: event `mote_picked {carried}`, +`per_mote`. Đầy thì không nhặt, đom đóm ở lại.
4. **Nạp đèn:** cạnh false→true của interact, `carried > 0`, có đèn **chưa thắp** trong `interact_radius` (chọn gần nhất, hòa thì id nhỏ hơn). Nạp `amount = min(carried, lantern_cost − deposited)` ⇒ event `deposit`. Nếu `deposited = lantern_cost` ⇒ đèn thắp, event `lantern_lit` cùng tick, +`per_lantern`. Không đủ điều kiện ⇒ không có event.
5. **Tỏa sáng (pulse):** cạnh false→true, `t ≥ hết cooldown`, `carried ≥ pulse_cost`. Trừ `pulse_cost`, đặt cooldown đến `t + 60`. Mọi Bóng Mực trong `pulse_radius` (kể cả con đang choáng) bị choáng đến tick `t + 180` và bị đẩy `pulse_push_m` ra xa người chơi theo XZ (trùng vị trí ⇒ đẩy theo +X). Mỗi con +`per_stun`. Event `pulse {stunned_ids}` (theo thứ tự danh sách, có thể rỗng). Thiếu điều kiện ⇒ không có gì xảy ra, không có event.
6. **Bóng Mực:** trạng thái `chase` (đuổi người chơi khắp đảo) hoặc `stunned` (đứng yên). Con đang choáng trở lại `chase` ở tick `t = stun_until` và di chuyển ngay tick đó. Bước di chuyển = `shade_speed/60` hướng về người chơi theo XZ (không vượt quá người chơi). Sau mọi lần di chuyển hoặc đẩy: không được ở trong `safe_radius` của **đèn đã thắp** (bị đẩy ra mép), kẹp trong bán kính đảo.
7. **Bị chạm:** có Bóng Mực không choáng trong `shade_hit_radius`, và `t ≥ hết bất tử` ⇒ flames −1, `dropped = floor(carried × hit_drop_ratio)`, bất tử đến `t + 90`, event `player_hit {by:"shade", flames, dropped}`. Nhiều con cùng chạm trong một tick chỉ tính 1 lần.
8. **Kết thúc** (kiểm tra cuối mỗi bước, theo thứ tự ưu tiên):
   1. Mọi đèn đã thắp ⇒ `won / all_lit`, cộng `per_second_left × floor(time_left_s)` + `per_flame_left × flames`.
   2. `flames ≤ 0` ⇒ `lost / no_flames`.
   3. `time_left_s ≤ 0` ⇒ `lost / dawn`.
   Ghi event `game_over`, dừng mô phỏng.

## 4. Thứ tự xử lý trong một bước k (tạo trạng thái t = k+1)
1. Áp frame input có `tick == k`; tính cạnh false→true của jump/interact/pulse.
2. Di chuyển người chơi + nhảy/trọng lực.
3. Nhặt đom đóm.
4. Interact → deposit / lantern_lit.
5. Pulse.
6. Bóng Mực: hết choáng → chase; di chuyển; ràng buộc safe_radius; sinh Bóng Mực mới (event `shade_spawned`). Sinh thêm đom đóm.
7. Kiểm tra bị chạm.
8. `time_left_s = thời lượng ban đầu − t/60`.
9. Kiểm tra kết thúc.

Sau bước: ghi các event của tick t, rồi snapshot nếu `t % snapshot_every == 0`. Dòng `end` cuối cùng; `ticks` = số bước đã chạy.

## 5. Headless & scenario
- `--night` khác 1 ⇒ lỗi (mã 1). Thiếu tham số bắt buộc ⇒ mã 1. File inputs/scenario không đọc được, không phải JSON, sai kiểu/khoảng giá trị, tick không tăng nghiêm ngặt, id đèn không tồn tại ⇒ **mã 2**.
- Scenario: `player.pos/carried/flames`; `time_left_s` thay cho thời lượng ban đầu; `lanterns[]` cập nhật theo id (`pos`, `deposited`, `lit`; nếu không có `lit` thì `lit = deposited ≥ lantern_cost`); `motes`, `shades` thay thế danh sách (id M1…, S1… theo thứ tự nếu không cho id). `random_motes:false` ⇒ không sinh đom đóm (cả ban đầu lẫn về sau); `random_shades:false` ⇒ không sinh Bóng Mực. Dựng scenario không phát event, không cộng điểm.
- Không có snapshot "bonus" khi game kết thúc giữa chừng: snapshot chỉ ở các tick chia hết cho `--snapshot-every`; trạng thái cuối nằm ở dòng `end`.
- Tọa độ, `time_left_s` làm tròn 3 chữ số; snapshot có thêm mảng `motes` (id, pos) theo khuyến nghị.

## 6. Câu hỏi đã hỏi trợ giảng
Xem `docs/notes/ta-questions-phase1.md`.
