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
