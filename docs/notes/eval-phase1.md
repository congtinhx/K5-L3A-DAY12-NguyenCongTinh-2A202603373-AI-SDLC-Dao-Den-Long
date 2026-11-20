# Đánh giá Phase 1

| Yêu cầu PRD-0 | Trạng thái |
|---|---|
| Một màn Đêm 1 – Đảo Bến, đảo tròn, 5 đèn | Đạt |
| Đi lại, nhảy, camera 3D | Đạt (camera sau lưng, xoay bằng chuột/J-L) |
| Đom đóm rải rác, nhặt được | Đạt (60 con theo seed, sinh thêm khi < 20) |
| Nạp ánh sáng thắp đèn | Đạt |
| Bóng Mực xuất hiện, đuổi | Đạt |
| Tỏa sáng xua Bóng Mực | Đạt |
| Thắng/thua/điểm/HUD | Đạt |
| Chơi lại | Đạt (phím R) — kiểm bằng mắt khi chơi, **chưa có clip** |
| Đảo sáng dần khi thắp đèn | Code có (ánh sáng/sương theo số đèn) — **chưa có ảnh bằng chứng** khi đã thắp đèn |
| game.contract.json + headless | Đạt (32 scenario + verify) |

**Hỏng phase trước?** Không áp dụng (phase đầu).
**Rủi ro còn lại:** 3 giả định chưa được trợ giảng xác nhận (`ta-questions-phase1.md`); máy chấm cần Node ≥ 22.18.
**Cần chỉnh:** bổ sung ảnh/clip "đèn đã thắp" + "màn thắng/thua + chơi lại"; hỏi trợ giảng trên claude.ai.
