# Design Document — Phase 1: Foundation & Baseline

## Architecture Overview

```
App.tsx
└── FuriganaProvider (mở rộng: +JLPT presets, +Supabase sync)
    └── Navigation (cập nhật dropdown: 7 options)
    └── JapaneseText (cập nhật shouldDisplayFurigana logic)
    └── [tất cả pages]

src/components/ui/SakuraSkeleton.tsx  [MỚI]
src/components/InstallPrompt.tsx      [MỚI]
src/hooks/useOfflineQueue.ts          [MỚI]
vite.config.ts                        [cập nhật: thêm vite-plugin-pwa]
supabase/functions/push-notify/       [MỚI Edge Function]
```

---

## 1. Furigana JLPT Presets

### FuriganaContext.tsx — thay đổi

```ts
// Trước
export type FuriganaMode = 'always' | 'never' | 'smart';

// Sau
export type FuriganaMode = 'always' | 'n5' | 'n4' | 'n3' | 'n2' | 'never' | 'smart';
```

**Supabase sync logic** thêm vào `FuriganaProvider`:
```ts
// Load từ Supabase khi login
useEffect(() => {
  if (user) {
    supabase.from('profiles').select('furigana_mode').eq('user_id', user.id).single()
      .then(({ data }) => { if (data?.furigana_mode) setModeInternal(data.furigana_mode) });
  }
}, [user]);

// Save lên Supabase (debounce 1s)
useEffect(() => {
  localStorage.setItem('furigana-mode', mode);
  if (user) {
    const t = setTimeout(() => {
      supabase.from('profiles').update({ furigana_mode: mode }).eq('user_id', user.id);
    }, 1000);
    return () => clearTimeout(t);
  }
}, [mode, user]);
```

### JapaneseText.tsx — shouldDisplayFurigana logic

```ts
const shouldDisplayFurigana = () => {
  if (mode === 'never') return false;
  if (mode === 'always') return true;
  if (mode === 'smart' && level) {
    const kLevel = JLPT_LEVELS[level] || 5;
    const uLevel = JLPT_LEVELS[userLevel] || 5;
    if (kLevel >= uLevel) return false;
  }
  // JLPT preset modes: ẩn nếu kanji level >= threshold
  const presetThresholds: Record<string, number> = { n5: 5, n4: 4, n3: 3, n2: 2 };
  if (mode in presetThresholds && level) {
    const kLevel = JLPT_LEVELS[level] || 5;
    return kLevel < presetThresholds[mode];
  }
  return showFurigana;
};
```

### Navigation.tsx — cập nhật dropdown

Thêm 4 DropdownMenuItem mới cho n5/n4/n3/n2 với icon và label phù hợp.

### Database

```sql
ALTER TABLE profiles ADD COLUMN furigana_mode TEXT DEFAULT 'smart';
```

---

## 2. SakuraSkeleton Component

**File:** `src/components/ui/SakuraSkeleton.tsx`

```tsx
// Shimmer animation (thêm vào index.css)
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, hsl(var(--sakura)/0.1) 25%, hsl(var(--sakura)/0.3) 50%, hsl(var(--sakura)/0.1) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

**Variants:**
- `card` — rounded-xl, h-32, full width
- `list-item` — flex row: avatar circle (h-10 w-10) + 2 text lines
- `leaderboard-row` — flex row: rank number + avatar + name + xp bar
- `news-card` — image placeholder (h-48) + 3 text lines
- `message-bubble` — alternating left/right bubbles

**Props:** `variant`, `count = 1`, `className`

---

## 3. PWA

### vite.config.ts

```ts
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: '日本語マスター',
      short_name: 'JP Master',
      theme_color: 'hsl(345 85% 65%)',
      background_color: 'hsl(30 40% 98%)',
      display: 'standalone',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    workbox: {
      runtimeCaching: [
        { urlPattern: /\/rest\/v1\/(flashcards|grammar|kanji)/, handler: 'StaleWhileRevalidate', options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 86400 } } },
      ],
    },
  }),
]
```

### InstallPrompt.tsx

```tsx
// Lắng nghe beforeinstallprompt event
// Hiển thị banner khi app installable
// Lưu dismissed state vào localStorage với timestamp
// Không hiện lại trong 30 ngày
```

### useOfflineQueue.ts

```ts
// IndexedDB store: 'offline-queue'
// enqueue(action): thêm { id: uuid, type, payload, timestamp }
// sync(): lấy tất cả items, gọi Supabase, xóa sau khi thành công
// Idempotency: dùng id để upsert thay vì insert
```

### Push Notifications — Edge Function

```
supabase/functions/push-notify/index.ts
- Nhận trigger: daily_reminder | streak_warning | challenge_update
- Lấy push subscriptions từ bảng profiles
- Gửi Web Push với VAPID keys
```

### Database

```sql
ALTER TABLE profiles ADD COLUMN push_subscription JSONB;
ALTER TABLE profiles ADD COLUMN push_daily_reminder BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN push_streak_warning BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN push_reminder_hour INTEGER DEFAULT 20;
```

---

## Correctness Properties

1. **Round-trip**: `read(write(mode)) == mode` cho tất cả 7 FuriganaMode values
2. **JLPT preset visibility**: mode=`n5` + từ N5 → furigana ẩn; mode=`n5` + từ N4 → furigana hiện
3. **Skeleton count**: render với `count=N` → DOM có đúng N skeleton items
4. **Offline queue idempotency**: sync cùng item 2 lần → chỉ 1 bản ghi trong DB
5. **Cache invariant**: resource đã cache → offline response == cached response
