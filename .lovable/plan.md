# Lộ trình nâng cấp 9 feature

Chia 4 phase theo độ phụ thuộc dữ liệu & độ phức tạp. Mỗi phase độc lập, có thể ship riêng.

---

## Phase 1 — Nền tảng phân tích & UX nhanh thắng (1 lượt)
Mục tiêu: dựng dữ liệu phân tích & 2 tính năng chạm nhiều user nhất.

### 1.1 Weakness Heatmap (`/dashboard/heatmap`)
- Trang grid JLPT N5–N1 × {Kanji, Grammar, Vocab}.
- Màu ô = mastery score (xanh→đỏ) tính từ `user_kanji_progress`, `user_grammar_progress`, `user_vocabulary_progress` + `grammar_mistakes`.
- Click ô đỏ → mở modal "Mini-Quest 5 phút" gọi RPC `generate_weakness_quest(category, level)` → trả 10 câu nhắm yếu nhất.
- DB: thêm view `v_user_mastery_matrix` aggregate sẵn.

### 1.2 Cmd+K Search Palette
- Component `CommandPalette` (shadcn `cmdk`) global, shortcut ⌘K / Ctrl+K.
- Tab: All / Kanji / Vocab / Deck / Video / Friend / Lesson / Page.
- Backend: edge function `global-search` dùng Postgres `pg_trgm` similarity trên các bảng tương ứng.
- Recent + pinned items lưu localStorage.

### 1.3 A/B Test framework
- Bảng `experiments(id, key, variants jsonb, traffic, is_active)` + `experiment_assignments(user_id, experiment_key, variant)`.
- Hook `useExperiment(key)` → trả variant ổn định (hash user_id).
- Bảng `experiment_events(user_id, experiment_key, variant, event, value, ts)` log conversion.
- Trang admin `/admin/experiments` xem funnel cơ bản (assign → convert).

---

## Phase 2 — Adaptive SRS dùng AI
Phụ thuộc: Phase 1 đã có heatmap dữ liệu mastery.

### 2.1 Mistake pattern miner
- Edge function `analyze-mistakes` chạy nightly (Inngest cron) — gom `grammar_mistakes`, `pronunciation_results`, sai trong `user_kanji_progress` của 30 ngày gần nhất.
- AI (gemini-3-flash-preview) phân loại pattern: `homophone_kanji`, `verb_group2_te_form`, `particle_wa_ga`, … → lưu `user_weakness_patterns(user_id, pattern_key, score, evidence jsonb, updated_at)`.

### 2.2 Adaptive review session
- RPC `get_adaptive_review_queue(limit)` trả mix: 70% FSRS due cards + 30% câu nhắm `user_weakness_patterns` top 3.
- Mỗi câu chèn thêm có `injected_reason` để UI hiển thị badge "🎯 luyện điểm yếu: nhầm kanji đồng âm".
- Frontend `FlashcardSession` hỗ trợ render badge + log kết quả về pattern để giảm score khi đúng.

### 2.3 Visualization
- Trên Heatmap thêm panel "Top 5 điểm yếu của bạn" + nút "Luyện ngay 10 phút".

---

## Phase 3 — Nội dung học mở rộng
2 feature lớn, độc lập nhau, có thể song song.

### 3.1 Listening Lab (`/listening-lab`)
- Nguồn audio: từ `video_segments` (đã có), thêm bảng `listening_exercises(id, title, audio_url, transcript, jlpt_level, type)`.
- 3 chế độ:
  - **Speed Trainer**: player tốc độ 0.5/0.75/1/1.25/1.5x (Web Audio playbackRate).
  - **Fill-in-the-blank**: AI tự đục lỗ key words trong transcript → user gõ.
  - **Dictation**: dùng lại logic char-diff hiện có.
- Lưu `user_listening_attempts(exercise_id, score, mistakes jsonb)`.

### 3.2 Reader Mode (`/reader`)
- Input: URL hoặc paste text.
- Edge function `fetch-article` dùng Mozilla Readability (port Deno) → trả text sạch.
- Edge function `add-furigana` dùng kuromoji.js (đã có trong project) → wrap kanji bằng `<ruby>`.
- UI: toggle furigana on/off, hover từ → popover dictionary (jisho-style từ bảng `vocabulary` + AI fallback), nút "Lưu vào deck".
- Lưu lịch sử `reader_articles(user_id, url, title, content, created_at)` để offline đọc lại.

---

## Phase 4 — Cộng đồng & Offline
Phụ thuộc: profiles & friendships đã có.

### 4.1 Study Buddy Match
- Mở rộng `profiles`: thêm `learning_goal`, `daily_minutes_target`, `timezone`, `looking_for_buddy bool`.
- Edge function `match-study-buddy` nightly: chạy thuật toán ghép cặp (cùng JLPT ±1, timezone chênh ≤3h, cùng goal) → tạo `buddy_suggestions`.
- Trang `/buddies`: xem 5 gợi ý/tuần, accept → tự tạo `conversations` + `buddy_schedule(buddy_pair_id, type='shadowing', cron, next_at)`.
- Notification khi tới giờ luyện chung.

### 4.2 Public Profile `/u/:username`
- Thêm `profiles.username` unique + `is_public bool`.
- Trang public (no auth) hiển thị: avatar, streak, total XP, top 10 kanji mastered, decks đã publish (community_decks), badges, biểu đồ XP 30 ngày.
- Open Graph meta cho share social.
- RLS: public view `v_public_profile` chỉ expose field cho phép.

### 4.3 Offline-first PWA mở rộng
- Mở rộng `useOfflineQueue` hiện có: cache thêm
  - Flashcard due hôm nay (IndexedDB `dexie`).
  - Bài đọc Reader Mode đã mở.
  - 5 listening exercise cuối.
- Sync queue khi `online`: replay POST/PATCH trong queue.
- UI badge "Offline mode — X items cached".
- ⚠️ PWA service worker chỉ enable production (không trong preview iframe).

---

## Technical notes
- DB migrations: ~6 migration files, 1 cho mỗi nhóm phase.
- AI: tất cả gọi qua Lovable AI Gateway (`google/gemini-3-flash-preview`), không lộ key client.
- Background jobs (analyze-mistakes, match-study-buddy): dùng Inngest connector + cron event.
- Realtime: tận dụng `messages`/`notifications` đã enable.
- Performance: heatmap & cmd+K phải <200ms — dùng materialized view + pg_trgm index.

---

## Đề xuất thứ tự ship
1. **Phase 1** trước (giá trị tức thì + dựng nền data) — ~3–4 vòng chat.
2. **Phase 2** (Adaptive SRS) — cần data từ Phase 1.
3. **Phase 3** (Listening Lab & Reader Mode song song hoặc lần lượt).
4. **Phase 4** (Social + Offline).

**Câu hỏi cho bạn:**
- OK với thứ tự này không, hay muốn đảo (vd. Reader Mode trước vì cần gấp)?
- Phase 1 có muốn enable Inngest connector ngay (phục vụ A/B + nightly job sau này) hay để Phase 2 mới bật?
- Cmd+K có cần search cả nội dung trong deck/lesson (full-text) hay chỉ tiêu đề?
