# Design: Phase 2 — Visual Delight & Gamification

## Architecture Overview

```
Feature 1: Achievement Animations
├── src/components/effects/SakuraBurst.tsx      — particle effect component
├── src/components/effects/GoldSparkles.tsx     — sparkle effect component
├── src/hooks/useAchievementAnimation.ts        — animation queue manager
└── src/components/StreakBadge.tsx              — updated với onUnlock prop

Feature 2: Real-Time Vocabulary Duels
├── src/components/duel/DuelRoom.tsx            — main duel UI (inline trong Challenges)
├── src/components/duel/DuelQuestion.tsx        — single question card với timer
├── src/hooks/useDuelChannel.ts                 — Supabase Realtime channel hook
└── src/pages/Challenges.tsx                    — updated: "CHƠI NGAY" mở DuelRoom
```

---

## Feature 1: Achievement Animations

### SakuraBurst Component

```tsx
// Render N cánh hoa bay ra từ một điểm origin
interface SakuraBurstProps {
  active: boolean;          // trigger animation
  origin?: { x: number; y: number }; // default: center screen
  petalCount?: number;      // default: 12
  onComplete?: () => void;
}
```

**Animation logic:**
- Mỗi petal: random angle (0-360°), random distance (80-200px), random rotation (0-720°)
- Duration: 1.8s với easing `easeOut`
- Cleanup: unmount sau khi `onComplete` được gọi
- Render: `position: fixed`, `pointer-events: none`, `z-index: 9999`

### GoldSparkles Component

```tsx
interface GoldSparklesProps {
  active: boolean;
  particleCount?: number;   // default: 20
  onComplete?: () => void;
}
```

**Animation logic:**
- Particles xuất hiện random trên toàn màn hình
- Scale: 0 → 1 → 0 với stagger 0.1s
- Colors: `#FFD700`, `#FFA500`, `#FFE066`
- Duration: 2.5s total

### useAchievementAnimation Hook

```ts
interface AnimationEvent {
  type: 'sakura_burst' | 'gold_sparkles';
  trigger: 'streak_milestone' | 'league_promotion' | 'achievement_unlock';
  metadata?: Record<string, unknown>;
}

// Returns:
// - currentAnimation: AnimationEvent | null
// - triggerAnimation: (event: AnimationEvent) => void
// - clearAnimation: () => void
```

**Queue logic:** Chỉ play 1 animation tại một thời điểm. Nếu có animation đang chạy, queue event mới và play sau khi animation hiện tại xong.

### Integration Points

- `Achievements.tsx`: Khi `achievement.unlocked` thay đổi từ false → true, trigger `sakura_burst`
- `Leagues.tsx`: Khi user rank thay đổi lên cao hơn, trigger `gold_sparkles`
- `StreakBadge.tsx`: Thêm prop `onMilestone?: (streak: number) => void` để notify parent

---

## Feature 2: Real-Time Vocabulary Duels

### State Machine

```
WAITING ──(both players joined)──► COUNTDOWN (3s)
COUNTDOWN ──(countdown ends)──► PLAYING
PLAYING ──(60s elapsed OR all questions answered)──► FINISHED
PLAYING ──(opponent disconnects 10s)──► FINISHED (win by forfeit)
FINISHED ──(user clicks "Chơi lại")──► back to Challenges list
```

### DuelRoom Component

```tsx
interface DuelRoomProps {
  challenge: Challenge;           // từ Challenges.tsx state
  onClose: () => void;            // đóng DuelRoom, về list
}
```

**Layout (mobile-first):**
```
┌─────────────────────────────────┐
│  [Bạn: 0đ]    VS    [Đối thủ: 0đ]  │  ← score bar
│  ████████░░░░░░░░░░░░░░░░░░░░░  │  ← progress (câu x/6)
├─────────────────────────────────┤
│                                 │
│     [Từ tiếng Nhật to]          │  ← question
│     (furigana nếu cần)          │
│                                 │
│  [⏱ 8s]                        │  ← countdown ring
│                                 │
│  [A] Lựa chọn 1                 │
│  [B] Lựa chọn 2                 │
│  [C] Lựa chọn 3                 │
│  [D] Lựa chọn 4                 │
└─────────────────────────────────┘
```

### useDuelChannel Hook

```ts
interface DuelState {
  myScore: number;
  opponentScore: number;
  opponentConnected: boolean;
  currentQuestion: number;
}

function useDuelChannel(challengeId: string, userId: string): {
  duelState: DuelState;
  broadcastAnswer: (questionIndex: number, score: number) => void;
  isConnected: boolean;
}
```

**Realtime channel:** `duel:${challengeId}`
- Event `player_answer`: `{ playerId, questionIndex, score }`
- Event `player_presence`: dùng Supabase Presence để track online status

### Question Generation

Lấy từ bảng `vocabulary` (nếu có) hoặc hardcode 20 từ N5 phổ biến làm fallback:
```ts
interface DuelQuestion {
  word: string;        // tiếng Nhật
  reading: string;     // furigana
  correct: string;     // nghĩa đúng (tiếng Việt)
  options: string[];   // 4 lựa chọn (shuffle)
}
```

### Scoring Formula

```ts
const calcScore = (timeLeft: number, maxTime: number = 10) =>
  Math.round(100 * (timeLeft / maxTime));
// Trả lời ngay (10s còn lại) = 100đ
// Trả lời lúc còn 5s = 50đ
// Trả lời lúc còn 1s = 10đ
```

### Database Updates

Khi duel kết thúc, upsert vào `challenges`:
```sql
UPDATE challenges SET
  challenger_score = ?,
  opponent_score = ?,
  winner_id = ?,
  status = 'completed',
  completed_at = NOW()
WHERE id = ?
```

---

## Migration

Không cần migration mới — dùng `challenges` table đã có với các cột `challenger_score`, `opponent_score`, `winner_id`.

Nếu bảng `vocabulary` không có data, dùng fallback word list hardcoded trong `DuelQuestion.tsx`.
