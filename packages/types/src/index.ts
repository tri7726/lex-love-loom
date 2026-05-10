/**
 * @lex-love-loom/types
 *
 * Shared types & Zod schemas consumed by both the React frontend (apps/frontend)
 * and the NestJS backend (apps/backend). Keep this package free of runtime
 * dependencies other than `zod` so it works in both Node and the browser.
 */
export * from "./schemas";
export type { JlptLevel, ApiError, Paginated } from "./common";
