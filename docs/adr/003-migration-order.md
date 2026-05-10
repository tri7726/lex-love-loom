# ADR 003 — Thứ tự migrate Edge Functions sang NestJS

- **Status:** Accepted
- **Date:** 2026-05-10
- **Liên quan:** ADR 002 (Hybrid)

## Context

10 endpoints cần migrate. Nếu chọn sai thứ tự, có thể block dependency hoặc phá user flow chính.

## Decision

Migrate theo **4 sóng**, mỗi sóng chỉ release sau khi sóng trước verified ổn ≥ 1 tuần.

### Wave 1 — Low-risk, high-showcase (Tuần 3)
1. `ai-explain` → `ai/explain` (SSE streaming)
2. `generate-grammar-quiz` → `quiz/grammar` (caching layer)

**Lý do chọn đầu:** stateless, không phụ thuộc DB write, dễ rollback (FE chỉ swap 1 line).

### Wave 2 — Medium complexity (Tuần 4)
3. `analyze-speech` → `speaking/analyze` (multipart upload, scoring)
4. `sensei-rag` → `rag/query` (pgvector qua service_role)

**Lý do:** vẫn read-mostly, nhưng test được Multer + RAG pipeline.

### Wave 3 — Stateful + queue (Tuần 6)
5. `process-video` → `video/process` (BullMQ producer + worker)
6. `generate-video-quiz` → `quiz/video` (multi-step)
7. `japanese-chat` → `chat/stream` (SSE + key rotation)

**Lý do:** cần infra (Redis Upstash) đã setup ở Tuần 6.

### Wave 4 — Sensitive (Tuần 6 cuối)
8. `evolve-skills` → `skills/evolve`
9. `admin-manage-role` → `admin/roles` (RBAC + audit)
10. `sensei-insights` → `insights/aggregate`

**Lý do cuối:** có business rules + RBAC + audit log → cần infra Wave 3 stable.

## Feature flag protocol

Mỗi endpoint migrate theo 4 bước:

1. **Deploy NestJS endpoint** với cùng input/output schema như Edge function.
2. **FE thêm flag** `VITE_USE_NESTJS_<NAME>=true|false`. Mặc định `false`.
3. **Verify song song 1 tuần** với 10% traffic (manual hoặc qua flag user-id whitelist).
4. **Flip flag = true** cho 100%, theo dõi 48h, rồi xoá Edge function khỏi `supabase/functions/`.

## Rollback

Vì Edge function chưa xoá, rollback = `VITE_USE_NESTJS_<NAME>=false` + redeploy FE (~2 phút).

## Consequences

- Không bao giờ có downtime > 2 phút.
- Mỗi wave có boundary rõ — dễ pause nếu lệch tiến độ.
- FE phải maintain 2 code path cho mỗi endpoint trong tối thiểu 1 tuần — chấp nhận cost này để đổi an toàn.
