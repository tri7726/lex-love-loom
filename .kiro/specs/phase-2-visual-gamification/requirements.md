# Requirements: Phase 2 — Visual Delight & Gamification

## Overview

Nâng cấp trải nghiệm visual và gamification với hai tính năng chính:
1. **Enhanced Achievement Animations** — hiệu ứng "Sakura Burst" và "Gold Sparkles" khi đạt mốc streak/thành tựu
2. **Real-Time Vocabulary Duels** — mở rộng trang Challenges hiện có với chế độ đấu từ vựng thời gian thực 60 giây qua Supabase Realtime

---

## Feature 1: Enhanced Achievement Animations

### User Stories

**US-1.1** — Khi người dùng đạt mốc streak quan trọng (7, 14, 30, 100 ngày), hệ thống hiển thị hiệu ứng "Sakura Burst" với các cánh hoa bay ra từ badge.

**US-1.2** — Khi người dùng được thăng hạng League (Bronze → Silver → Gold → Platinum → Diamond), hệ thống hiển thị hiệu ứng "Gold Sparkles" toàn màn hình.

**US-1.3** — Khi người dùng unlock một Achievement mới, badge đó phát sáng và có animation scale-up kèm particle effect nhỏ.

**US-1.4** — Animations không được gây lag — mỗi animation phải hoàn thành trong ≤ 3 giây và không block UI interaction.

**US-1.5** — Người dùng có thể bỏ qua (dismiss) animation bằng cách click/tap bất kỳ đâu.

### Acceptance Criteria

- AC-1.1: `SakuraBurst` component render ≥ 8 cánh hoa với random trajectory, duration 2s, tự cleanup sau khi xong
- AC-1.2: `GoldSparkles` component render ≥ 12 particles vàng, fade out sau 2.5s
- AC-1.3: `AchievementBadge` trong `StreakBadge.tsx` có thêm prop `onUnlock?: () => void` để trigger animation
- AC-1.4: Animations dùng `framer-motion` với `will-change: transform` để GPU-accelerated
- AC-1.5: Có `useAchievementAnimation` hook để quản lý queue animation (không overlap nhiều animation cùng lúc)

---

## Feature 2: Real-Time Vocabulary Duels

### User Stories

**US-2.1** — Khi người dùng nhấn "CHƠI NGAY" trên một challenge đã được accepted, họ vào màn hình duel thời gian thực.

**US-2.2** — Trong duel, cả hai người chơi thấy cùng một từ vựng tiếng Nhật và phải chọn nghĩa đúng trong 4 lựa chọn.

**US-2.3** — Mỗi round có countdown 10 giây. Trả lời đúng nhanh hơn được nhiều điểm hơn (max 100 điểm/câu).

**US-2.4** — Duel kéo dài 60 giây (6 câu hỏi). Kết thúc hiển thị kết quả và cập nhật `challenges` table.

**US-2.5** — Cả hai người chơi thấy điểm của nhau cập nhật real-time qua Supabase Realtime channel.

**US-2.6** — Nếu đối thủ disconnect, người còn lại thắng sau 10 giây chờ.

**US-2.7** — Sau khi duel kết thúc, winner nhận XP bonus (+50 XP) và cập nhật leaderboard trong `challenges` sidebar.

### Acceptance Criteria

- AC-2.1: Supabase Realtime channel `duel:{challengeId}` được tạo khi cả hai player vào màn hình
- AC-2.2: Câu hỏi được generate từ bảng `vocabulary` hoặc `flashcards` của user, random 6 câu
- AC-2.3: Scoring: `points = Math.round(100 * (timeLeft / 10))` — trả lời ngay được 100đ, trả lời lúc còn 5s được 50đ
- AC-2.4: State machine: `waiting → countdown → playing → finished`
- AC-2.5: Mỗi khi player trả lời, broadcast `{ playerId, score, questionIndex }` qua Realtime channel
- AC-2.6: `DuelRoom` component được render inline trong `Challenges.tsx` (không tạo route mới)
- AC-2.7: Kết quả được upsert vào `challenges` table: `challenger_score`, `opponent_score`, `winner_id`, `status: 'completed'`

---

## Non-Functional Requirements

- **NFR-1**: Không tạo page/route mới — mở rộng từ components hiện có
- **NFR-2**: Giữ nguyên UI/design language (sakura theme, rounded corners, framer-motion)
- **NFR-3**: TypeScript strict — dùng `(supabase as any)` cho bảng chưa có trong generated types
- **NFR-4**: Mobile-first — DuelRoom phải usable trên màn hình 375px
- **NFR-5**: Graceful degradation — nếu Realtime không kết nối được, fallback về polling mỗi 3s
