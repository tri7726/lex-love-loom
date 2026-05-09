# Implementation Plan: Phase 1 — Foundation & Baseline Improvements

## Overview

Mở rộng FuriganaContext với 7 modes + Supabase sync, tạo SakuraSkeleton component thay thế Loader2 spinner, và biến app thành PWA có thể cài đặt với offline support và push notifications.

## Tasks

- [x] 1. Group 1: Furigana JLPT Presets

  - [x] 1.1 Mở rộng `FuriganaMode` type và cập nhật `FuriganaContext.tsx`
    - Thay `FuriganaMode = 'always' | 'never' | 'smart'` thành `'always' | 'n5' | 'n4' | 'n3' | 'n2' | 'never' | 'smart'`
    - Thêm `useAuth` import để detect login state
    - Thêm `useEffect` load `furigana_mode` từ Supabase `profiles` khi user đăng nhập (override localStorage)
    - Thêm debounced save (1s) vào Supabase khi mode thay đổi và user đã đăng nhập
    - Giữ nguyên localStorage fallback cho unauthenticated users
    - _Requirements: 1.1, 2.1, 2.2, 2.3_

  - [ ]* 1.2 Write property test cho round-trip Supabase sync
    - **Property 1: Round-trip consistency** — `read(write(mode)) == mode` cho tất cả 7 FuriganaMode values
    - **Validates: Requirements 2.4**

  - [x] 1.3 Cập nhật `shouldDisplayFurigana()` trong `JapaneseText.tsx`
    - Thêm logic cho 4 JLPT preset modes (`n5`, `n4`, `n3`, `n2`)
    - Mode `n5`: ẩn furigana nếu `kLevel >= 5` (từ N5); hiện nếu N4/N3/N2/N1
    - Mode `n4`: ẩn nếu `kLevel >= 4` (từ N5 và N4); hiện nếu N3/N2/N1
    - Mode `n3`: ẩn nếu `kLevel >= 3`; hiện nếu N2/N1
    - Mode `n2`: ẩn nếu `kLevel >= 2`; hiện nếu N1
    - Sử dụng `JLPT_LEVELS` map đã có (`N5=5, N4=4, N3=3, N2=2, N1=1`)
    - _Requirements: 1.2, 1.3, 1.4_

  - [x] 1.4 Cập nhật Navigation dropdown furigana từ 3 lên 7 options
    - Thêm 4 `DropdownMenuItem` mới cho `n5`, `n4`, `n3`, `n2` vào furigana dropdown trong `Navigation.tsx`
    - Thêm icon trigger cho các mode mới (có thể dùng `BrainIcon` với badge level)
    - Labels: "N5 Preset", "N4 Preset", "N3 Preset", "N2 Preset" với mô tả ngắn
    - Cập nhật icon trigger button để hiển thị đúng icon cho mode đang active
    - _Requirements: 1.5_

  - [x] 1.5 Migration SQL: thêm cột `furigana_mode` vào `profiles`
    - Tạo file `supabase/migrations/add_furigana_mode_to_profiles.sql`
    - `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS furigana_mode TEXT DEFAULT 'smart'`
    - Thêm CHECK constraint: `CHECK (furigana_mode IN ('always','n5','n4','n3','n2','never','smart'))`
    - _Requirements: 2.1_

- [ ] 2. Checkpoint — Furigana
  - Đảm bảo FuriganaContext compile không lỗi, dropdown hiển thị đủ 7 options, logic ẩn/hiện đúng theo từng preset. Hỏi user nếu có thắc mắc.

- [x] 3. Group 2: SakuraSkeleton Component

  - [x] 3.1 Tạo `src/components/ui/SakuraSkeleton.tsx` với 5 variants
    - Props: `variant: 'card' | 'list-item' | 'leaderboard-row' | 'news-card' | 'message-bubble'`, `count?: number` (default 1), `className?: string`
    - Mỗi variant render đúng layout placeholder phản ánh cấu trúc nội dung thật
    - `leaderboard-row`: avatar circle + 2 text lines + XP number placeholder
    - `news-card`: image block (h-48) + title lines + description lines
    - `card`: full card với header và content lines
    - `list-item`: avatar + 2 text lines
    - `message-bubble`: bubble shape với text lines
    - Khi `count > 1`, render đúng N items
    - Border-radius `1.25rem`, hỗ trợ dark mode qua CSS variables
    - _Requirements: 3.1, 3.4_

  - [x] 3.2 Thêm shimmer keyframe animation vào `src/index.css`
    - Thêm `@keyframes shimmer` với gradient `sakura/10 → sakura/30 → sakura/10` chạy ngang
    - Duration 1.5s, `animation-iteration-count: infinite`
    - Thêm utility class `.skeleton-shimmer` sử dụng keyframe trên
    - _Requirements: 3.2, 3.3_

  - [ ]* 3.3 Write unit tests cho SakuraSkeleton
    - Test render đúng số lượng items khi `count = N`
    - Test mỗi variant render không throw error
    - _Requirements: 3.1, 3.4_

  - [x] 3.4 Thay `Loader2` spinner bằng `SakuraSkeleton` trong `Leagues.tsx`
    - Import `SakuraSkeleton` thay `Loader2`
    - Thay `<Loader2 className="h-8 w-8 animate-spin text-sakura" />` bằng `<SakuraSkeleton variant="leaderboard-row" count={5} />`
    - Wrap nội dung thật trong `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>` khi `!loading`
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.5 Thay `Loader2` spinner bằng `SakuraSkeleton` trong `News.tsx`
    - Thay loading state spinner bằng `<SakuraSkeleton variant="news-card" count={3} className="col-span-full grid md:grid-cols-2 lg:grid-cols-3 gap-8" />`
    - Giữ nguyên `Loader2` trong nút "Làm mới tin tức" (đây là action spinner, không phải page loader)
    - Wrap nội dung thật với fade-in animation
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 3.6 Thay `Loader2` spinner bằng `SakuraSkeleton` trong `Friends.tsx`, `Messages.tsx`, `Squads.tsx`, `Challenges.tsx`
    - Mỗi trang: tìm loading state, thay spinner bằng variant phù hợp
    - `Friends.tsx` → `variant="list-item" count={5}`
    - `Messages.tsx` → `variant="message-bubble" count={4}`
    - `Squads.tsx` → `variant="card" count={3}`
    - `Challenges.tsx` → `variant="card" count={3}`
    - Thêm fade-in transition cho nội dung thật
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4. Checkpoint — Skeleton
  - Đảm bảo SakuraSkeleton render đúng ở tất cả 6 trang, shimmer animation hoạt động, không có layout shift. Hỏi user nếu có thắc mắc.

- [ ] 5. Group 3: PWA

  - [x] 5.1 Cài `vite-plugin-pwa` và cập nhật `vite.config.ts`
    - Thêm `VitePWA` plugin với config: `registerType: 'autoUpdate'`, `includeAssets: ['favicon.ico', 'icons/*.png']`
    - Workbox `runtimeCaching`: `cache-first` cho static assets (JS/CSS/fonts), `stale-while-revalidate` (TTL 24h) cho Supabase API routes flashcards/grammar/kanji
    - Thêm `manifest` inline: `name`, `short_name: 'JP Master'`, `start_url: '/'`, `display: 'standalone'`, `theme_color`, icons 192/512px
    - _Requirements: 5.1, 5.2, 6.1, 6.2_

  - [-] 5.2 Tạo PWA icons
    - Tạo `public/icons/icon-192x192.png` và `public/icons/icon-512x512.png`
    - Có thể dùng placeholder SVG converted to PNG hoặc emoji-based icon 🌸
    - _Requirements: 5.1_

  - [-] 5.3 Tạo offline fallback page
    - Tạo `public/offline.html` — trang tĩnh hiển thị khi truy cập trang chưa cache khi offline
    - Nội dung: thông báo offline, link về trang chủ
    - Đăng ký trong Workbox config của `vite.config.ts`
    - _Requirements: 6.4_

  - [-] 5.4 Tạo `src/components/InstallPrompt.tsx`
    - Hook vào `beforeinstallprompt` event, lưu vào ref
    - Hiển thị banner/card với nút "Cài đặt" khi event fired
    - Khi nhấn "Cài đặt": gọi `prompt()`, ẩn banner
    - Khi đã cài đặt (`appinstalled` event): set flag trong localStorage với timestamp, ẩn trong 30 ngày
    - _Requirements: 5.3, 5.4_

  - [ ] 5.5 Tạo `src/hooks/useOfflineQueue.ts`
    - Dùng `idb` library để thao tác IndexedDB store `offline-queue`
    - Export `enqueue(action: OfflineAction)`: thêm item vào queue với `id` (UUID), `type`, `payload`, `timestamp`
    - Export `processQueue()`: lấy tất cả items, gọi Supabase upsert với `onConflict: 'id'` (idempotency), xóa item sau khi sync thành công
    - Lắng nghe `online` event để tự động gọi `processQueue()`
    - Hiển thị toast "Đã đồng bộ X hoạt động offline" sau khi sync thành công
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 5.6 Write property test cho OfflineQueue idempotency
    - **Property 2: Idempotency** — sync cùng item nhiều lần không tạo bản ghi trùng (upsert với same `id`)
    - **Validates: Requirements 7.3**

  - [ ] 5.7 Tạo `supabase/functions/push-notify/index.ts`
    - Deno edge function nhận `{ userId, type: 'daily_reminder' | 'streak_warning' | 'challenge_update', payload }`
    - Load VAPID keys từ env vars `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
    - Fetch `push_endpoint`, `push_p256dh`, `push_auth` từ `profiles` table theo `userId`
    - Gửi Web Push notification với `web-push` compatible library
    - _Requirements: 8.1, 8.3_

  - [ ] 5.8 Migration SQL: thêm các cột push vào `profiles`
    - Tạo file `supabase/migrations/add_push_columns_to_profiles.sql`
    - Thêm: `push_endpoint TEXT`, `push_p256dh TEXT`, `push_auth TEXT`, `push_enabled BOOLEAN DEFAULT false`, `push_reminder_time TEXT DEFAULT '20:00'`, `push_daily_reminder BOOLEAN DEFAULT true`, `push_streak_warning BOOLEAN DEFAULT true`, `push_challenge_update BOOLEAN DEFAULT true`
    - _Requirements: 8.1, 8.2_

  - [ ] 5.9 Tích hợp `InstallPrompt` vào app và thêm offline banner
    - Import và render `<InstallPrompt />` trong `App.tsx` hoặc layout root
    - Thêm offline detection hook: lắng nghe `online`/`offline` events
    - Hiển thị banner "Đang học offline" (fixed bottom, trên mobile nav) khi `!navigator.onLine`
    - _Requirements: 5.3, 6.3_

- [ ] 6. Final Checkpoint — Đảm bảo tất cả tests pass
  - Đảm bảo tất cả tests pass, PWA manifest hợp lệ (Lighthouse PWA audit), không có TypeScript errors. Hỏi user nếu có thắc mắc.

## Notes

- Tasks đánh dấu `*` là optional, có thể bỏ qua để MVP nhanh hơn
- Mỗi task tham chiếu requirements cụ thể để traceability
- Checkpoints đảm bảo validate incremental
- Property tests validate correctness properties quan trọng (round-trip sync, idempotency)
- `idb` package cần được cài: `npm install idb`
- `vite-plugin-pwa` cần được cài: `npm install -D vite-plugin-pwa`
- VAPID keys cần generate và thêm vào Supabase edge function env vars
