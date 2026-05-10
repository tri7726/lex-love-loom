# Monorepo packages

Shared workspace packages consumed by both `apps/frontend/` (React/Vite, currently still at repo root for Lovable compatibility) and `apps/backend/` (NestJS).

| Package | Purpose |
|---|---|
| `@lex-love-loom/types`  | Shared TypeScript interfaces + Zod schemas (DTOs) |
| `@lex-love-loom/config` | Shared ESLint base, tsconfig base, Tailwind preset |

## Activation

These packages are **scaffolded but not yet wired** into the root `package.json` as a workspace, because doing so would force Lovable's managed install to reconcile with `apps/backend/` and could break the preview. To activate:

1. Add to root `package.json`:
   ```json
   "workspaces": ["apps/*", "packages/*"]
   ```
2. Run `npm install` (or `bun install`) at the repo root.
3. In `apps/backend/package.json` add:
   ```json
   "dependencies": {
     "@lex-love-loom/types": "*",
     "@lex-love-loom/config": "*"
   }
   ```
4. In NestJS DTOs replace local Zod schemas with `import { ExplainSchema } from "@lex-love-loom/types"`.

Until then, treat these files as the **source of truth** and copy/paste when needed.
