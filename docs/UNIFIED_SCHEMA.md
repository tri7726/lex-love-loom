# UNIFIED SCHEMA — Admin & Analysis Framework

> Tài liệu này đồng bộ schema SQL thực tế trong Lovable Cloud với phần code của
> framework Admin / AI Analysis mà chúng ta đã xây dựng. Khi sửa migration mới
> liên quan tới các bảng dưới, **cập nhật file này cùng lúc**.
>
> Cập nhật: 2026-05-09 (sau migration `20260509012724`).

---

## 1. Phân quyền (RBAC)

### `public.app_role` (enum)
`admin | moderator | teacher | parent | user`

### `public.user_roles`
| column   | type      | note                                    |
|----------|-----------|-----------------------------------------|
| id       | uuid PK   | `gen_random_uuid()`                     |
| user_id  | uuid      | FK `auth.users.id` ON DELETE CASCADE    |
| role     | app_role  | UNIQUE `(user_id, role)`                |
| created_at | timestamptz | default `now()`                     |

**RLS**
- SELECT: `auth.uid() = user_id` HOẶC `has_role(auth.uid(), 'admin')`.
- INSERT/UPDATE/DELETE: chỉ `admin` (qua `has_role`) hoặc edge function với
  `SERVICE_ROLE_KEY` (`admin-manage-role`).

### Function `public.has_role(_user_id uuid, _role app_role) → boolean`
- `SECURITY DEFINER`, `STABLE`, `search_path = public`.
- Dùng trong **mọi** RLS policy admin để tránh đệ quy RLS.
- Hook FE: `useIsAdmin()` (`src/hooks/useIsAdmin.ts`) gọi RPC này.

### Trigger `auto_grant_admin_to_seed_emails`
- Trigger `AFTER INSERT ON auth.users`.
- Tự gán role `admin` khi email ∈ `('phamdjj6@gmail.com', 'phamdjjd6@gmail.com')`.
- `ON CONFLICT (user_id, role) DO NOTHING` → idempotent.
- **Lưu ý nghiệp vụ**: nếu email seed đã tạo tài khoản TRƯỚC khi trigger được
  cài, cần grant thủ công qua `admin-manage-role` hoặc INSERT trực tiếp.

### Edge function `admin-manage-role`
- `verify_jwt = false` (kiểm Authorization header thủ công).
- Actions: `lookup | grant | revoke`.
- **Bảo vệ self-lockout**: chặn nếu user revoke role `admin` của chính mình.
- Dùng `SUPABASE_SERVICE_ROLE_KEY` để truy cập `auth.users` (list/lookup email).

---

## 2. AI Analysis Framework

### `public.analysis_history` (cache AI để tiết kiệm token)
| column         | type   | note                                       |
|----------------|--------|--------------------------------------------|
| id             | uuid PK | `gen_random_uuid()`                       |
| user_id        | uuid    | NOT NULL                                  |
| content        | text    | input gốc (key cache)                     |
| analysis       | jsonb   | kết quả AI                                |
| engine         | text    | model id (vd `google/gemini-2.5-flash`)   |
| schema_version | int     | NOT NULL DEFAULT 1 — **bump khi đổi prompt/schema** để invalidate cache |
| created_at     | timestamptz | default `now()`                       |

**Logic nghiệp vụ**
- Khi đọc cache: WHERE `user_id`, `content`, `schema_version = CURRENT_VERSION`.
- Khi prompt/JSON shape của analysis đổi → tăng hằng số `ANALYSIS_SCHEMA_VERSION`
  ở client; cache cũ bị bỏ qua tự nhiên (không cần xoá).
- Index: `idx_analysis_history_schema_version`.

### `public.pitch_accent_overrides` (Layer 0 — admin chỉnh tay)
| column     | type    | note                              |
|------------|---------|-----------------------------------|
| id         | uuid PK |                                   |
| word       | text    | NOT NULL                          |
| reading    | text    | NOT NULL                          |
| downstep   | int     | NOT NULL — vị trí xuống giọng     |
| alternates | int[]   | các vị trí phụ                    |
| note       | text    | ghi chú admin                     |
| created_by | uuid    | FK `auth.users.id` ON DELETE SET NULL |
| UNIQUE     | (word, reading) |                            |

**RLS**
- SELECT: public (anyone) — vì client cần load để override.
- INSERT/UPDATE/DELETE: `has_role('admin')`.

**Logic nghiệp vụ trong `src/lib/pitchAccent.ts`**
- Thứ tự lookup: **Layer 0 overrides → NHK dataset → AI fallback**.
- `loadOverrides()` cache vào memory (Map) khi mount; CRUD UI tại
  `/admin/pitch-overrides` cần invalidate cache sau ghi (TODO nếu chưa có).

### `public.analysis_telemetry` (đo điểm yếu của lookup)
| column   | type   | note                                  |
|----------|--------|---------------------------------------|
| id       | uuid PK |                                      |
| user_id  | uuid    | nullable (anon vẫn ghi được)         |
| feature  | text    | vd `pitch_accent`, `grammar_sensei`  |
| event    | text    | `miss | hit | ai_fallback`           |
| reason   | text    | `not-found | no-reading | ...`       |
| word     | text    |                                      |
| reading  | text    |                                      |
| meta     | jsonb   | default `{}`                         |

**RLS**
- INSERT: anon + authenticated (fire-and-forget từ FE).
- SELECT/DELETE: chỉ `admin`.

**Logic nghiệp vụ**
- Buffer FE (`src/lib/telemetry.ts`): flush khi đủ **25 sự kiện** hoặc **4s**,
  hoặc khi `beforeunload` (kiểm tra xem đã gắn chưa — nếu thiếu, bổ sung).
- Dashboard `/admin/telemetry` aggregate theo `(feature, event, reason)` 7 ngày.

---

## 3. A/B Experiments (đã có sẵn, liên quan admin hub)

- `experiments(key UNIQUE, variants jsonb, traffic numeric, is_active)`.
- `experiment_assignments(user_id, experiment_key, variant)` — sticky bucketing.
- `experiment_events(user_id, experiment_key, variant, event, value)` —
  conversion tracking.
- Quản trị qua `/admin/experiments` (đã wired trong AdminDashboard).

---

## 4. Bản đồ bảng còn lại (không sửa trong đợt này)

Chỉ liệt kê để tham chiếu — **không thay đổi schema** trừ khi user yêu cầu:

- **Học liệu**: `kanji`, `kanji_details`, `kanji_radicals`, `kanji_relationships`,
  `grammar_points`, `minna_lessons`, `minna_vocabulary`, `reading_passages`,
  `reader_articles`, `lessons`, `lesson_slides`, `course_modules`,
  `video_sources`, `video_segments`, `video_questions`, `listening_exercises`,
  `speaking_lessons`, `shadowing_practices`, `roleplay_scenarios`,
  `mock_exams`, `mock_exam_questions`, `exam_questions`.
- **Tiến độ user**: `learning_progress`, `lesson_progress`, `user_kanji_progress`,
  `user_grammar_progress`, `user_vocabulary_progress`, `user_reading_progress`,
  `user_video_progress`, `user_listening_attempts`, `user_shadowing_progress`,
  `pronunciation_results`, `flashcards`, `saved_vocabulary`, `saved_sentences`,
  `vocabulary_folders`, `vocabulary_folder_items`, `favorite_videos`,
  `user_skill_metrics`, `user_weakness_patterns`, `user_evolved_skills`,
  `grammar_mistakes`.
- **Gamification**: `xp_events`, `achievements`, `user_achievements`,
  `daily_quests`, `daily_quest_progress`, `user_quests`, `challenges`,
  `bosses`, `user_boss_progress`, `kanji_battle_scores`, `shop_items`,
  `user_inventory`.
- **Pet**: `user_pets`, `pet_*` (gear, materials, recipes, shop_items,
  monsters, expeditions, adventure_areas, evolution_config, history,
  inventory, action_cooldowns, tickle_stats), `food_items`.
- **Social/Class**: `friendships`, `messages`, `conversations`, `notifications`,
  `study_squads`, `squad_members`, `squad_messages`, `squad_goals`,
  `classrooms`, `class_members`, `class_assignments`,
  `class_assignment_progress`, `live_sessions`, `community_decks`,
  `community_deck_cards`, `deck_ratings`, `public_decks`, `public_deck_items`,
  `buddy_suggestions`.
- **AI / hội thoại**: `ai_conversations`, `sensei_knowledge`.
- **An toàn / hệ thống**: `abuse_alerts`, `rate_limits`, `user_activities`,
  `user_settings`, `profiles`.
- **Views**: `v_public_profile`, `v_user_mastery_matrix`,
  `video_sources_public` — dùng để lộ field an toàn ra ngoài (giữ
  `SECURITY INVOKER` mặc định, không grant thêm).

---

## 5. Checklist khi thêm migration mới

1. Mỗi bảng mới: **bật RLS + viết đủ 4 policy** (SELECT/INSERT/UPDATE/DELETE)
   theo đúng đối tượng (user, admin qua `has_role`, public read).
2. Tránh CHECK constraint với `now()`/giá trị động → dùng trigger `BEFORE INSERT/UPDATE`.
3. Không động vào schema `auth/storage/realtime/supabase_functions/vault`.
4. Trigger admin / SECURITY DEFINER: luôn `SET search_path = public`.
5. Cache AI: nếu prompt đổi → bump `schema_version` thay vì xoá row.
6. Sau khi chạy migration → cập nhật **mục liên quan** trong file này +
   chạy `supabase--linter` để bắt cảnh báo.
