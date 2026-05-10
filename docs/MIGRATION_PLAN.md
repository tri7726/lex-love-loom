# Migration Plan: Hybrid NestJS + Lovable Cloud (Supabase)

> **Mục tiêu:** Showcase kỹ năng Fullstack (NestJS + React + Supabase) cho JD Intern 2026, đồng thời giữ hệ thống production hiện tại chạy ổn định.
> **Thời gian:** 8 tuần
> **Hosting:** Frontend (Lovable) + Backend NestJS (Railway) + DB/Auth/Realtime (Lovable Cloud)

---

## 1. Kiến trúc tổng quan

```text
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│  React (Vite)   │─────▶│  NestJS API      │─────▶│  Lovable Cloud      │
│  apps/frontend  │      │  apps/backend    │      │  (Supabase)         │
│                 │      │  Railway         │      │  Postgres/Auth/RT   │
└────────┬────────┘      └──────────────────┘      └──────────┬──────────┘
         │                                                     │
         └───── Realtime / Auth / Storage (direct) ────────────┘
```

- **FE → Supabase trực tiếp:** Auth, Realtime subscriptions, Storage upload/download
- **FE → NestJS:** Mọi business logic (AI, quiz, XP, RAG, admin, video processing)
- **NestJS → Supabase:** Postgres queries (service_role), JWT verify, Storage signed URLs

---

## 2. Phân loại 27 Edge Functions

### Giữ lại Edge (17) — low-latency, gần DB, cron, webhook

| Function | Lý do giữ |
|---|---|
| `scheduled-reminders` | Cron job |
| `push-notify` | Webhook nhẹ |
| `content-guard` | Filter nhanh |
| `lookup-word` | Tra cứu nhanh, cache nặng |
| `kanji-search` / `kanji-details` / `kanji-related` | Read-heavy, cache |
| `kanji-details`, `japanese-grammar`, `japanese-analysis` | Stateless lookup |
| `fetch-youtube-captions` | I/O nhẹ |
| `import-kanjidic2` | One-shot admin |
| `notebooklm-proxy` | Proxy đơn giản |
| `generate-reading` | Stateless gen |
| `generate-kanji-worksheet` | Stateless gen |
| `japanese-news` | RSS proxy |
| `global-search`, `fetch-article`, `analyze-mistakes` | Lookup/proxy |

### Migrate sang NestJS (10) — business logic phức tạp, showcase chính

| Function | Module NestJS | Showcase |
|---|---|---|
| `ai-explain` | `ai/` | Streaming SSE, prompt template |
| `analyze-speech` | `speaking/` | File upload, scoring algorithm |
| `generate-grammar-quiz` | `quiz/` | Generation + caching |
| `generate-video-quiz` | `quiz/` | Multi-step pipeline |
| `sensei-rag` | `rag/` | pgvector, embedding, retrieval |
| `sensei-insights` | `insights/` | Aggregation, analytics |
| `japanese-chat` | `chat/` | SSE streaming, key rotation |
| `process-video` | `video/` | BullMQ queue, long-running |
| `evolve-skills` | `skills/` | Business rules, scheduling |
| `admin-manage-role` | `admin/` | RBAC, audit log |

---

## 3. Lộ trình 8 tuần — Checklist

### Tuần 1 — Setup Monorepo
- [ ] Init Turborepo (`npx create-turbo@latest`)
- [ ] Move FE hiện tại vào `apps/frontend/` (KHÔNG refactor code)
- [ ] Tạo `packages/types/` — copy `supabase/types.ts` làm shared
- [ ] Tạo `packages/config/` — eslint + tsconfig + tailwind preset shared
- [ ] Verify FE vẫn build & deploy bình thường trên Lovable
- [ ] Setup `turbo.json` với pipeline build/dev/lint/test

### Tuần 2 — NestJS Skeleton + Deploy
- [ ] `nest new apps/backend`
- [ ] Cấu trúc module: `auth/`, `health/`, `users/`
- [ ] **JWT Guard** verify Supabase token (`@nestjs/passport` + `passport-jwt`, JWKS từ Supabase)
- [ ] Endpoint `/health` + `/me` (return claims)
- [ ] Config: `@nestjs/config` + `.env.example`
- [ ] Deploy lên Railway (Dockerfile + railway.json)
- [ ] FE tạo `lib/apiClient.ts` (axios + interceptor attach Supabase JWT)
- [ ] CORS config cho `*.lovable.app` + `localhost:5173`

### Tuần 3 — Migrate AI Endpoints (phần 1)
- [ ] Module `ai/` — migrate `ai-explain`
  - [ ] Service gọi Lovable AI Gateway / Groq
  - [ ] DTO + Zod validation pipe
  - [ ] SSE streaming response
- [ ] Module `quiz/` — migrate `generate-grammar-quiz`
  - [ ] Caching layer (in-memory LRU đầu tiên)
- [ ] FE: thay `supabase.functions.invoke('ai-explain')` → `apiClient.post('/ai/explain')`
- [ ] Verify song song: Edge function vẫn live làm fallback 1 tuần

### Tuần 4 — Migrate AI Endpoints (phần 2)
- [ ] Module `speaking/` — migrate `analyze-speech`
  - [ ] Multipart upload (`@nestjs/platform-express` + Multer)
  - [ ] Scoring algorithm + return JSON detailed
- [ ] Module `rag/` — migrate `sensei-rag`
  - [ ] pgvector query qua Supabase service_role
  - [ ] Embedding generation
- [ ] FE switch tương ứng
- [ ] Xóa edge functions đã migrate sau khi verify ổn

### Tuần 5 — Quality Layer
- [ ] **Swagger** — `@nestjs/swagger` autogen từ DTO + decorators
- [ ] **Validation** — `ZodValidationPipe` global
- [ ] **Exception filter** — global error handler trả về `{code, message, details}`
- [ ] **Logger** — Pino + request-id middleware
- [ ] **Health check** chi tiết — DB ping, AI provider ping
- [ ] README structure docs trong `apps/backend/README.md`

### Tuần 6 — Infra Showcase
- [ ] **Rate limit** — `@nestjs/throttler` + Redis (Upstash free tier)
- [ ] **BullMQ** — migrate `process-video` thành queue worker
  - [ ] Producer endpoint `/video/process`
  - [ ] Worker process (separate Railway service hoặc cùng container)
  - [ ] Status endpoint `/video/:id/status`
- [ ] **Audit log** middleware cho admin endpoints
- [ ] Migrate `admin-manage-role`, `evolve-skills`

### Tuần 7 — Testing + CI
- [ ] **Unit tests** — Jest cho services AI, RAG, scoring (mock Supabase)
- [ ] **E2E tests** — Supertest cho 4 endpoints chính (`/ai/explain`, `/quiz/grammar`, `/speaking/analyze`, `/rag/query`)
- [ ] Coverage target: ~60%
- [ ] **GitHub Actions CI** — lint + typecheck + test + build cả FE & BE
- [ ] Branch protection rule cho `main`

### Tuần 8 — Polish + Demo
- [ ] **Architecture diagram** (Excalidraw export PNG + Mermaid trong README)
- [ ] **ADR docs** trong `docs/adr/`:
  - [ ] `001-why-nestjs.md`
  - [ ] `002-hybrid-edge-and-nestjs.md`
  - [ ] `003-monorepo-turborepo.md`
- [ ] **README root** — overview + quick start + deployment
- [ ] **OpenAPI spec** export → import Postman collection trong `docs/`
- [ ] **Demo video** 3-5 phút walkthrough kiến trúc
- [ ] Final deploy + smoke test production

---

## 4. Cấu trúc Monorepo cuối cùng

```text
lex-love-loom/
├── apps/
│   ├── frontend/              # React + Vite (Lovable managed)
│   └── backend/               # NestJS API (Railway)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── ai/
│       │   │   ├── quiz/
│       │   │   ├── speaking/
│       │   │   ├── rag/
│       │   │   ├── chat/
│       │   │   ├── video/
│       │   │   ├── skills/
│       │   │   ├── admin/
│       │   │   └── insights/
│       │   ├── common/
│       │   │   ├── guards/    # JwtGuard, RolesGuard
│       │   │   ├── pipes/     # ZodValidationPipe
│       │   │   ├── filters/   # AllExceptionsFilter
│       │   │   └── interceptors/
│       │   ├── config/
│       │   └── main.ts
│       ├── test/
│       └── Dockerfile
├── packages/
│   ├── types/                 # Shared Supabase types + DTO
│   ├── ui/                    # Optional: shared React components
│   ├── utils/                 # Shared helpers
│   └── config/                # eslint, tsconfig, tailwind preset
├── supabase/                  # Migrations + remaining edge functions
│   ├── functions/             # 17 edge functions còn lại
│   └── migrations/
├── docs/
│   ├── MIGRATION_PLAN.md      # File này
│   ├── adr/
│   └── architecture.png
├── turbo.json
├── package.json               # workspaces
└── README.md
```

---

## 5. Decision matrix nhanh

| Quyết định | Chọn | Alternative |
|---|---|---|
| Backend framework | **NestJS** | Express, Fastify |
| Hosting backend | **Railway** | Render, Fly.io, VPS |
| Repo | **Turborepo monorepo** | Nx, polyrepo |
| Validation | **Zod** | class-validator |
| Logger | **Pino** | Winston |
| Rate limit store | **Upstash Redis** | Memory (single instance only) |
| Queue | **BullMQ** | Inngest, Trigger.dev |
| Testing | **Jest + Supertest** | Vitest |
| API docs | **Swagger autogen** | Manual Postman |

---

## 6. Risk & Mitigation

| Rủi ro | Mitigation |
|---|---|
| Production down trong lúc migrate | Giữ edge function 1 tuần overlap, FE feature-flag switch |
| Cold start Railway | Dùng paid plan ($5) hoặc keep-warm cron |
| JWT verify sai | Test bằng valid + expired + tampered token |
| CORS lỗi giữa Lovable preview domains | Whitelist regex `*.lovable.app` |
| Type drift FE/BE | `packages/types` shared + CI check |
| Quá tải scope 8 tuần | Cut tuần 6 BullMQ nếu chậm — không bắt buộc |

---

## 7. Definition of Done (cho phỏng vấn)

- [ ] Repo public trên GitHub với README + diagram
- [ ] Backend live trên Railway với Swagger UI accessible
- [ ] FE production vẫn chạy bình thường
- [ ] ≥ 4 endpoints migrated + tested
- [ ] CI xanh trên main
- [ ] 3 ADR documents
- [ ] Demo video 3-5 phút

---

## 8. Trạng thái thực tế (cập nhật 2026-05-10)

### ✅ Đã hoàn thành
- **Tuần 1:** `turbo.json` ở root, `packages/types/` (DTO + Zod schemas chia sẻ), `packages/config/` (ESLint + tsconfig + Tailwind preset)
- **Tuần 2:** `apps/backend/` NestJS skeleton, JWT Guard (jose + JWKS), `/health` + `/me`, Dockerfile + railway.json, CORS cho `*.lovable.app`, `src/lib/apiClient.ts` + `streamSSE` helper
- **Bonus (vượt scope):** 4 module showcase (`ai`, `quiz`, `speaking`, `rag`), Swagger + Zod pipe + Pino + exception filter (Tuần 5), Throttler (Tuần 6), unit test, GitHub Actions CI (`.github/workflows/backend-ci.yml`), ADR 001, demo component `BackendExplainDemo`

### ⚠️ Cố ý SKIP (Lovable constraint)
- **Move FE → `apps/frontend/`**: giữ FE ở `src/` root để Lovable preview không vỡ. Khi tách repo cho production, di chuyển + thêm `"workspaces": ["apps/*", "packages/*"]` vào root `package.json`.
- **Activate workspaces**: `packages/*` đã scaffold nhưng chưa wire vào root để tránh `npm install` reconcile với `apps/backend/`. Xem `packages/README.md` để kích hoạt.

### 🔜 Cần làm tiếp
- Deploy thử lên Railway (push repo → connect Railway → set env vars → verify `/docs` accessible)
- ~~ADR 002~~ ✅ `docs/adr/002-hybrid-edge-and-nestjs.md`
- ~~ADR 003~~ ✅ `docs/adr/003-migration-order.md`
- ~~Wire FE 1 endpoint feature-flag~~ ✅ `src/lib/aiExplainClient.ts` (flag `VITE_USE_NESTJS_AI_EXPLAIN`)
- ~~Refactor `deepExplain()` → `explain()` từ `aiExplainClient`~~ ✅ `src/services/groqServices.ts`

### 🐛 Audit flow Wave 1 (2026-05-10) — đã fix

Trước đó 3 schema cho `/ai/explain` lệch nhau (`{prompt}` vs `{text}` vs `{question}`) và NestJS stream text trong khi FE gọi `JSON.parse()`. Đã chuẩn hoá theo contract của Edge:

- `packages/types`: `ExplainSchema = { question, context?, explain_type? }` + `DeepExplainResultSchema` (shared response shape).
- `apps/backend/ai/dto/explain.dto.ts`: cùng schema, mirror để build standalone.
- `apps/backend/ai/ai.service.ts`: non-stream JSON gọi Lovable AI Gateway với `response_format: json_object`, system prompt structured giống Edge, validate response qua Zod.
- `apps/backend/ai/ai.controller.ts`: `POST /ai/explain` trả `DeepExplainResult` JSON (SSE để Wave 2).
- `src/lib/aiExplainClient.ts`: NestJS branch dùng `apiFetch()` thay vì `streamSSE` + `JSON.parse(full)`.
- `.env.example`: thêm `VITE_BACKEND_URL` và `VITE_USE_NESTJS_AI_EXPLAIN`.

**Verify:** chạy `apps/backend` local, set `VITE_BACKEND_URL=http://localhost:3001` + `VITE_USE_NESTJS_AI_EXPLAIN=true`, mở game bất kỳ → "Giải thích AI" phải trả response giống khi tắt cờ. Tắt cờ → fallback Edge.

### 🚀 Nâng cấp 2026-05-10 (Wave 2 + 3 + 4 + Hardening)

**Wave 2 — Streaming SSE cho `/ai/explain`** ✅
- `apps/backend/ai/ai.service.ts`: thêm `explainStream()` dùng `stream:true` từ Lovable AI Gateway, đẩy SSE events `{type:"token"|"result"|"done"|"error"}` mirror Edge contract.
- `apps/backend/ai/ai.controller.ts`: `POST /ai/explain/stream` set headers `text/event-stream`, pipe Node Readable → Express response.
- `src/lib/apiClient.ts`: thêm `streamSSEEvents()` parse generic SSE events.
- `src/lib/aiExplainClient.ts`: thêm `explainStream(input, onEvent, signal)` route theo flag, fallback Edge với `stream:true`.

**Wave 3 — Port `/quiz/grammar` sang NestJS** ✅
- `apps/backend/quiz/dto/grammar-quiz.dto.ts`: DTO mirror Edge `generate-grammar-quiz` body (`mode`, `grammar_point`, `level`, `explanation`, `currentLevel`) + `QuizResultSchema` validate response.
- `apps/backend/quiz/quiz.service.ts`: gọi Lovable AI Gateway với 2 system prompt (quiz/assessment), `response_format: json_object`, in-memory cache 1h theo key `(mode|level|currentLevel|grammar_point)`.

**Wave 4 — Port `/rag/query` (sensei-rag retrieve)** ✅
- `apps/backend/rag/dto/query.dto.ts`: `{user_id, query, topK}` mirror Edge retrieve action.
- `apps/backend/rag/rag.service.ts`: dùng `SupabaseService.admin` đọc `sensei_knowledge`, scoring keyword + recency identical với Edge (substring +5, word +1, recency boost ×1.3/×1.15/×0.85), trả `{context: ScoredItem[]}` cùng shape. Write-path actions (`index`, `summarize_and_index`, `update_profile`) tạm giữ Edge.

**Hardening** ✅
- `apps/backend/ai/ai.service.spec.ts`: 3 unit tests (success, schema invalid, 429 → rate-limit). Mock `global.fetch`.
- JWKS auth đã sẵn sàng (`SUPABASE_JWKS_URL` trong `.env.example`); JwtAuthGuard ưu tiên JWKS, fallback symmetric `SUPABASE_JWT_SECRET`.
- CI `.github/workflows/backend-ci.yml` chạy `lint → test → build` cho mọi PR đụng `apps/backend/**`.

**Cách bật flag end-to-end:**
1. Deploy `apps/backend` (Railway) với `LOVABLE_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `SUPABASE_JWKS_URL`.
2. Set `VITE_BACKEND_URL` = URL Railway và `VITE_USE_NESTJS_AI_EXPLAIN=true` trong FE env.
3. Mở "Giải thích AI" — UI sẽ stream token-by-token qua NestJS thay vì gọi Edge trực tiếp.

