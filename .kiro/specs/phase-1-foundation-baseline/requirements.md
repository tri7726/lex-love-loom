# Requirements Document

## Introduction

Phase 1 tập trung vào việc cải thiện trải nghiệm người dùng cơ bản cho ứng dụng học tiếng Nhật. Ứng dụng đã có sẵn `FuriganaContext` với 3 modes (`always`, `never`, `smart`) và lưu vào `localStorage`. Phase 1 sẽ **mở rộng** những gì đã có thay vì xây lại từ đầu.

Phase 1 bao gồm 3 cải tiến:
1. **Furigana JLPT Presets** — Mở rộng từ 3 modes lên 6 (thêm N5/N4/N3/N2) và lưu preference vào Supabase.
2. **PWA & Offline Readiness** — Biến app thành PWA có thể cài đặt, học offline và nhận push notification.
3. **Skeleton Loaders** — Thay `Loader2` spinner bằng `SakuraSkeleton` component ở các trang data-heavy.

---

## Glossary

- **FuriganaMode**: `'always' | 'n5' | 'n4' | 'n3' | 'n2' | 'never' | 'smart'` — mở rộng từ 3 lên 7 giá trị.
- **FuriganaContext**: Context đã có tại `src/contexts/FuriganaContext.tsx`, cần mở rộng.
- **SakuraSkeleton**: Component skeleton loader mới với shimmer animation theo Sakura design system.
- **PWA**: Progressive Web App — cài được lên home screen, học offline.
- **OfflineQueue**: IndexedDB queue lưu hành động khi offline để sync sau.
- **ServiceWorker**: Script nền xử lý cache và push notification.

---

## Requirements

### Requirement 1: Furigana JLPT Presets — Mở rộng modes

**User Story:** Là người học N3, tôi muốn chọn preset N3 để chỉ ẩn furigana của các từ N3 trở lên, giúp tôi tự thử thách đúng trình độ.

#### Acceptance Criteria

1. `FuriganaMode` SHALL được mở rộng thêm 4 giá trị: `n5`, `n4`, `n3`, `n2` — bên cạnh `always`, `never`, `smart` đã có.
2. Khi mode là `n5`, chỉ ẩn furigana của từ có JLPT level N5; N4/N3/N2/N1 vẫn hiện.
3. Khi mode là `n4`, ẩn furigana của từ N5 và N4; N3/N2/N1 vẫn hiện. Tương tự cho `n3`, `n2`.
4. `JapaneseText` component đã có `JLPT_LEVELS` map — SHALL sử dụng map này để quyết định ẩn/hiện theo preset.
5. Navigation dropdown furigana SHALL hiển thị đủ 7 options với label rõ ràng.

---

### Requirement 2: Furigana JLPT Presets — Lưu vào Supabase

**User Story:** Là người học dùng nhiều thiết bị, tôi muốn cài đặt furigana đồng bộ giữa các thiết bị.

#### Acceptance Criteria

1. WHEN người dùng đã đăng nhập thay đổi mode, App SHALL lưu vào cột `furigana_mode` trong bảng `profiles` trên Supabase (debounce 1s).
2. WHEN người dùng đăng nhập, App SHALL load `furigana_mode` từ Supabase và override `localStorage`.
3. WHEN người dùng chưa đăng nhập, App SHALL tiếp tục dùng `localStorage` như hiện tại.
4. Round-trip property: `read(write(mode)) == mode` cho tất cả 7 giá trị FuriganaMode.

---

### Requirement 3: Skeleton Loaders — SakuraSkeleton Component

**User Story:** Là người dùng mobile, tôi muốn thấy loading placeholder đẹp thay vì spinner đơn điệu.

#### Acceptance Criteria

1. App SHALL có `SakuraSkeleton` component với prop `variant`: `card | list-item | leaderboard-row | news-card | message-bubble`.
2. Shimmer animation: gradient `sakura/10 → sakura/30 → sakura/10` chạy ngang, duration 1.5s, infinite.
3. Border-radius 1.25rem, hỗ trợ dark mode.
4. Khi render với `count = N`, SHALL render đúng N items.

---

### Requirement 4: Skeleton Loaders — Áp dụng cho các trang

**User Story:** Là người dùng, tôi muốn thấy skeleton phù hợp layout thật khi dữ liệu đang tải.

#### Acceptance Criteria

1. Leaderboard, News, Friends, Messages, Squads, Challenges SHALL thay `Loader2` spinner bằng `SakuraSkeleton` tương ứng.
2. WHEN dữ liệu tải xong, SHALL fade-in từ skeleton sang nội dung thật (opacity 0→1, 300ms).
3. Skeleton layout SHALL phản ánh đúng cấu trúc nội dung thật để tránh layout shift (CLS < 0.1).

---

### Requirement 5: PWA — Installability

**User Story:** Là người học thường xuyên, tôi muốn cài app lên điện thoại để truy cập nhanh.

#### Acceptance Criteria

1. App SHALL có `manifest.webmanifest` hợp lệ với `name`, `short_name`, `start_url`, `display: "standalone"`, `theme_color`, icons 192/512px.
2. App SHALL đăng ký Service Worker thành công trên HTTPS/localhost.
3. WHEN trình duyệt detect app installable, SHALL hiển thị `InstallPrompt` với nút "Cài đặt".
4. WHEN đã cài đặt, SHALL ẩn `InstallPrompt` và không hiện lại trong 30 ngày.

---

### Requirement 6: PWA — Offline Caching

**User Story:** Là người đi tàu điện ngầm, tôi muốn học flashcards khi không có mạng.

#### Acceptance Criteria

1. ServiceWorker SHALL cache static assets (JS, CSS, fonts) bằng `cache-first`.
2. ServiceWorker SHALL cache dữ liệu Flashcards, Grammar, Kanji bằng `stale-while-revalidate`, TTL 24h.
3. WHILE offline, App SHALL hiển thị banner "Đang học offline" và cho phép dùng Flashcards/Grammar/Kanji.
4. IF truy cập trang chưa cache khi offline, SHALL hiển thị offline fallback page.
5. Cache invariant: `offline_response == cached_response` cho tất cả cached resources.

---

### Requirement 7: PWA — Background Sync

**User Story:** Là người học, tôi muốn tiến độ được lưu dù mất kết nối.

#### Acceptance Criteria

1. WHEN hoàn thành flashcard/quiz khi offline, App SHALL lưu kết quả vào `OfflineQueue` (IndexedDB).
2. WHEN kết nối khôi phục, ServiceWorker SHALL tự động sync `OfflineQueue` lên Supabase.
3. Idempotency: sync cùng item nhiều lần SHALL không tạo bản ghi trùng.
4. WHEN sync thành công, SHALL hiển thị toast "Đã đồng bộ X hoạt động offline".

---

### Requirement 8: PWA — Push Notifications

**User Story:** Là người hay quên, tôi muốn nhận thông báo nhắc học mỗi ngày.

#### Acceptance Criteria

1. App SHALL hỗ trợ 3 loại notification: `daily_reminder`, `streak_warning`, `challenge_update`.
2. SHALL cho phép user tùy chỉnh giờ nhắc (mặc định 20:00) và bật/tắt từng loại trong Settings.
3. WHEN nhấn notification, SHALL mở đúng trang liên quan.
4. Background Sync API không hỗ trợ Safari/iOS — SHALL có fallback (polling hoặc in-app reminder).

---

## Dependencies & Constraints

- Cần thêm cột `furigana_mode` vào bảng `profiles` trong Supabase.
- `vite-plugin-pwa` + Workbox để generate Service Worker và manifest.
- VAPID keys cho Web Push API.
- `idb` library cho IndexedDB (OfflineQueue).
- Service Worker chỉ hoạt động trên HTTPS hoặc localhost.
- Background Sync chưa hỗ trợ Safari/iOS — cần fallback.
- PWA install prompt chỉ xuất hiện một lần theo browser policy.
