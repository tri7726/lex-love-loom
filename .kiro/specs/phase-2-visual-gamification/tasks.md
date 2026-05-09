# Implementation Plan: Phase 2 — Visual Delight & Gamification

## Overview

Implement Enhanced Achievement Animations (Sakura Burst + Gold Sparkles) và Real-Time Vocabulary Duels mở rộng từ Challenges.tsx hiện có.

## Tasks

- [ ] 1. Group 1: Achievement Animations

  - [ ] 1.1 Tạo `src/components/effects/SakuraBurst.tsx`
    - Props: `active: boolean`, `origin?: {x,y}`, `petalCount?: number` (default 12), `onComplete?: () => void`
    - Render N petals với random angle/distance/rotation dùng `framer-motion`
    - `position: fixed`, `pointer-events: none`, `z-index: 9999`
    - Auto-cleanup sau 2s
    - _Requirements: AC-1.1, AC-1.4_

  - [ ] 1.2 Tạo `src/components/effects/GoldSparkles.tsx`
    - Props: `active: boolean`, `particleCount?: number` (default 20), `onComplete?: () => void`
    - Particles random position toàn màn hình, scale 0→1→0, stagger 0.1s
    - Colors: `#FFD700`, `#FFA500`, `#FFE066`
    - Duration 2.5s, auto-cleanup
    - _Requirements: AC-1.2, AC-1.4_

  - [ ] 1.3 Tạo `src/hooks/useAchievementAnimation.ts`
    - State: `currentAnimation`, queue array
    - `triggerAnimation(event)`: nếu đang có animation → queue; nếu không → play ngay
    - `clearAnimation()`: clear current, play next từ queue nếu có
    - _Requirements: AC-1.5_

  - [ ] 1.4 Tích hợp animations vào `Achievements.tsx`
    - Import `useAchievementAnimation`, `SakuraBurst`, `GoldSparkles`
    - Khi achievement mới unlock (so sánh prev vs current stats), trigger `sakura_burst`
    - Render `<SakuraBurst />` và `<GoldSparkles />` ở root của component
    - _Requirements: US-1.3, AC-1.3_

  - [ ] 1.5 Tích hợp `GoldSparkles` vào `Leagues.tsx`
    - Khi user rank thay đổi lên cao hơn, trigger `gold_sparkles`
    - _Requirements: US-1.2_

- [ ] 2. Checkpoint — Animations
  - Kiểm tra SakuraBurst và GoldSparkles render đúng, không lag, dismiss được bằng click.

- [ ] 3. Group 2: Real-Time Vocabulary Duels

  - [ ] 3.1 Tạo `src/hooks/useDuelChannel.ts`
    - Supabase Realtime channel `duel:{challengeId}`
    - Track `myScore`, `opponentScore`, `opponentConnected` qua Presence
    - Export `broadcastAnswer(questionIndex, score)` và `isConnected`
    - Fallback polling mỗi 3s nếu Realtime không kết nối
    - _Requirements: AC-2.1, AC-2.5, US-2.6_

  - [ ] 3.2 Tạo `src/components/duel/DuelQuestion.tsx`
    - Props: `question: DuelQuestion`, `onAnswer: (correct: boolean, timeLeft: number) => void`, `timeLimit?: number` (default 10)
    - Countdown ring animation (SVG circle stroke-dashoffset)
    - 4 option buttons, highlight đúng/sai sau khi chọn
    - Disable sau khi đã chọn
    - _Requirements: US-2.2, US-2.3, AC-2.3_

  - [ ] 3.3 Tạo `src/components/duel/DuelRoom.tsx`
    - State machine: `waiting | countdown | playing | finished`
    - Dùng `useDuelChannel` hook
    - Generate 6 câu hỏi từ vocabulary fallback list (N5 words)
    - Score bar real-time cho cả 2 player
    - Kết thúc: upsert `challenges` table, hiển thị kết quả
    - _Requirements: US-2.1 → US-2.7, AC-2.4, AC-2.6, AC-2.7_

  - [ ] 3.4 Tích hợp `DuelRoom` vào `Challenges.tsx`
    - Thêm state `activeDuel: Challenge | null`
    - Nút "CHƠI NGAY" set `activeDuel = challenge`
    - Render `{activeDuel ? <DuelRoom challenge={activeDuel} onClose={() => setActiveDuel(null)} /> : <...existing UI...>}`
    - _Requirements: US-2.1, AC-2.6_

- [ ] 4. Final Checkpoint — Phase 2
  - Kiểm tra DuelRoom hoạt động, animations không lag, mobile layout đúng.

## Notes

- Tất cả effects dùng `framer-motion` đã có sẵn trong project
- Vocabulary fallback list: 20 từ N5 phổ biến hardcoded trong DuelRoom
- Supabase Realtime channel cần enable trong Supabase dashboard (Realtime → Tables)
- XP bonus (+50) sau khi thắng duel: upsert vào `profiles.total_xp`
