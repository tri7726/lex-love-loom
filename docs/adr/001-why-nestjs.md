# ADR 001 — Why NestJS for the hybrid backend

- **Status:** Accepted
- **Date:** 2026-05-10
- **Context window:** Migration plan, weeks 1-2

## Context

The product runs entirely on **Lovable Cloud (Supabase)** with 27 Edge
Functions. To match the JD requirement *"Fullstack Intern with Node.js
backend experience"* we need a server-side codebase that is:

1. Showcase-able on GitHub and a CV.
2. Compatible with our existing Supabase Postgres + Auth + Storage.
3. Realistic for production (DI, validation, observability, testing).
4. Cheap to host and easy to deploy.

We considered: **NestJS**, plain **Express**, **Fastify + custom layout**,
**Hono on Node**, and keeping everything in **Edge Functions only**.

## Decision

Adopt **NestJS 10** for the new `apps/backend/` service, deployed on
**Railway** behind the existing Lovable frontend.

## Rationale

| Criterion              | NestJS | Express | Fastify | Hono | Edge only |
| ---------------------- | :----: | :-----: | :-----: | :--: | :-------: |
| Opinionated structure  |   ✅   |    ❌   |    ❌   |  ❌  |    ❌     |
| DI + Module system     |   ✅   |    ❌   |    ❌   |  ❌  |    ❌     |
| First-class Swagger    |   ✅   |    ⚠️   |    ⚠️   |  ⚠️  |    ❌     |
| Guards / Interceptors  |   ✅   |    ❌   |    ⚠️   |  ⚠️  |    ❌     |
| Industry recognition   |   ✅   |    ✅   |    ⚠️   |  ⚠️  |    ⚠️     |
| Test ergonomics        |   ✅   |    ⚠️   |    ⚠️   |  ⚠️  |    ⚠️     |
| Cold start             |   ⚠️   |    ✅   |    ✅   |  ✅  |    ✅     |

NestJS wins on every dimension that matters for a portfolio piece and a
mid-term codebase. Cold start is mitigated by Railway's always-on
container model.

## Consequences

**Positive**
- Clean module boundaries (`ai/`, `quiz/`, `speaking/`, `rag/`, …).
- JWT verification via Supabase JWKS in a single global `JwtAuthGuard`.
- Zod pipes + Swagger autogen give us validated, documented endpoints
  for free.
- Pino + global exception filter standardize logging and error shape.

**Negative**
- Extra build step and Docker image (~120 MB) to maintain.
- Two deploy targets (Lovable Cloud for FE/Edge, Railway for NestJS).
- Type drift risk between Supabase generated types and Nest DTOs —
  mitigated by sharing Zod schemas in `packages/types/` later.

## Alternatives rejected

- **Express only** — too unopinionated; reviewers want to see structure.
- **Hono / Fastify** — fast but weak ecosystem for guards/DI/Swagger.
- **Edge Functions only** — already in place; does not satisfy the JD.

## Follow-ups

- ADR 002 — JWT verification strategy (JWKS vs symmetric secret).
- ADR 003 — Which Edge Functions to migrate first and why.
