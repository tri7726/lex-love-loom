# ADR 002 — Hybrid: Giữ Edge Functions song song NestJS

- **Status:** Accepted
- **Date:** 2026-05-10
- **Liên quan:** ADR 001 (NestJS), `docs/MIGRATION_PLAN.md`

## Context

Dự án có 27 Supabase Edge Functions đang phục vụ production. Việc rewrite tất cả sang NestJS một lần (big-bang) có 3 rủi ro:

1. **Production downtime** — bất kỳ regression nào cũng ảnh hưởng user thật.
2. **Cold start chi phí cao** — Railway free tier ngủ sau ~5 phút, một số endpoint `lookup-word`, `kanji-search` cần latency thấp.
3. **Mất 8 tuần chỉ để hoà vốn** — không có incremental value để showcase.

## Decision

Dùng **kiến trúc hybrid**:

- **Giữ trên Edge** (17 functions): cron, webhook, lookup nhanh, RSS proxy, stateless gen.
- **Migrate sang NestJS** (10 functions): business logic phức tạp, streaming, queue, RBAC.

Phân loại chi tiết: xem `docs/MIGRATION_PLAN.md` §2.

### Tiêu chí giữ lại Edge

| Tiêu chí | Ví dụ |
|---|---|
| Cold-start nhạy cảm (<300ms) | `lookup-word`, `kanji-search` |
| Cron / scheduled | `scheduled-reminders` |
| Webhook nhỏ, stateless | `push-notify`, `content-guard` |
| Read-heavy có cache nặng | `kanji-details`, `kanji-related` |
| One-shot admin tool | `import-kanjidic2` |

### Tiêu chí migrate sang NestJS

| Tiêu chí | Ví dụ |
|---|---|
| Streaming SSE phức tạp | `ai-explain`, `japanese-chat` |
| Multi-step pipeline | `process-video`, `generate-video-quiz` |
| Long-running cần queue | `process-video` (BullMQ) |
| RBAC + audit | `admin-manage-role` |
| RAG / vector / embedding | `sensei-rag`, `sensei-insights` |
| File upload + scoring algorithm | `analyze-speech` |

## Consequences

**Tích cực**
- Migration không phá production: FE feature-flag chuyển từng endpoint.
- Showcase đủ depth (NestJS + queue + RAG + SSE) mà không phải port hết 27 functions.
- Mỗi loại workload chạy đúng runtime tối ưu (Edge cho lookup, Node cho stateful).

**Tiêu cực**
- 2 codebase, 2 deployment pipeline (Lovable Cloud cho Edge, Railway cho NestJS).
- 2 hệ thống logging (Supabase logs + Pino).
- Phải maintain JWT verify ở cả 2 nơi.

**Mitigation**
- ADR 003 quy định thứ tự migrate để tránh dependency hell.
- `packages/types/` chia sẻ DTO/Zod schema giữa FE ↔ NestJS để tránh drift.
- FE `apiClient.ts` + `streamSSE` chuẩn hoá cách gọi NestJS, tách biệt khỏi `supabase.functions.invoke()`.

## Alternatives rejected

- **Big-bang rewrite tất cả 27 functions sang NestJS** → 8 tuần không đủ, rủi ro production cao.
- **Giữ 100% trên Edge** → không showcase được NestJS skill cho JD Intern 2026.
- **Migrate sang Hono trên Edge** → vẫn không có DI, decorators, queue native — không showcase đúng yêu cầu JD.
