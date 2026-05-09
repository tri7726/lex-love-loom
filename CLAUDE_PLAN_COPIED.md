# Plan: Execute CLAUDE_MISSION.md — 5 Tasks

## Context
The other AI assistant (Antigravity) left a mission brief with 5 specific tasks. The user has instructed me to read and execute them. This plan covers all 5 tasks.

---

## Task 1: KILL STUCK PROCESS — Remove stale `C:UsersPheo.claudeplans` directory
**Problem:** A previous `mkdir -p C:\Users\Pheo\.claude\plans` command ran through bash, which treats `\` as escape character. This created a literal directory `C:UsersPheo.claudeplans` in the project root instead of under `~\.claude\plans`. This directory is stale and shouldn't exist in the project root.

**Also:** 5 lingering VS Code PowerShell terminals are running (shell integration scripts). These are normal VS Code terminal processes, not stuck commands. But check if any Deno process (PID 23880) is stuck.

**Actions:**
1. Remove the stale `C:UsersPheo.claudeplans` directory from project root
2. Kill the Deno process (PID 23880) if it's a stale `supabase functions serve` from earlier sessions
3. The VS Code PowerShell terminals are normal — leave them

## Task 2: DB FIX — Drop `vocabulary` table and re-run migration
**Problem:** The `vocabulary` table might exist without the `lesson` column. The migration at `supabase/migrations/20260427_create_minna_vocabulary.sql` defines the table with a `lesson` column.

**Examination of migration:**
```sql
CREATE TABLE IF NOT EXISTS vocabulary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  lesson INTEGER NOT NULL,       -- ← This IS included
  kanji TEXT,
  word TEXT NOT NULL,
  ...
);
```

The migration already has `lesson INTEGER NOT NULL`. The other AI says to "drop and re-run" — implying the current table might be out of date or the migration wasn't applied cleanly.

**Actions:**
1. Run SQL via Supabase: `DROP TABLE IF EXISTS vocabulary CASCADE;`
2. Run the migration SQL to recreate it with the `lesson` column
3. Also create indexes and RLS policies

## Task 3: TYPE SAFETY — Fix `VocabWord` interface conflict
**Current state:**
- `src/types/vocabulary.ts` exports `VocabWord` interface with fields: `id`, `word`, `reading`, `hanviet?`, `meaning`, `mastery_level?`, `example_sentence?`, `example_translation?`, `example?`, `exampleMeaning?`, `jlpt_level?`, `word_type?`, `created_at?`
- `src/hooks/useFlashcardFolders.ts` imports `VocabWord` from `@/types/vocabulary` and uses it for `CustomFolder.words[]` and in `addWordToFolder`
- The conflict: `VocabWord` uses `example_sentence`/`example_translation` but the `flashcards` Supabase table might have different column names. The hook casts `flashcard as any` which bypasses type safety.

**Actions:**
1. Align `VocabWord` interface to match the Supabase `flashcards` table schema (check actual column names)
2. Remove the `any` cast in `useFlashcardFolders.ts` by adding proper type mapping
3. Or create a separate `FlashcardWord` type for the hook if schemas diverge

## Task 4: EXPORT FIX — Export `InsertVocabulary` and `UpdateVocabulary` from vocabularyService
**Problem:** `src/services/vocabularyService.ts` imports `InsertVocabulary` and `UpdateVocabulary` from `@/types/vocabulary` but doesn't re-export them. If another module tries to `import { InsertVocabulary } from '@/services/vocabularyService'`, it won't find them.

**Actions:**
1. Add re-exports at end of `vocabularyService.ts`:
```typescript
export type { InsertVocabulary, UpdateVocabulary } from '@/types/vocabulary';
```

## Task 5: HOISTING — Move `handleQuizAnswer` definition above its usage
**Current state:** In `src/components/vocabulary/KanjiStudyOverlay.tsx`:
- `handleQuizAnswer` is defined at line 80 with `React.useCallback`
- It's referenced earlier in the timer `useEffect` at line 108

**Note:** In React, this works fine at runtime because effects run after render, by which time `handleQuizAnswer` is defined. However, for code clarity and to satisfy linters that don't hoist `const` declarations, the definition should be moved before the timer effect.

**`fetchVocabulary`:** Does not exist anywhere in the codebase. Will skip this part of the task.

**Actions:**
1. Move `handleQuizAnswer` definition (lines 80-95) before the `startQuiz` function (line 71) and the timer `useEffect` (line 98)
2. Ensure `startQuiz` function still has access to `handleQuizAnswer` (it will, since both are in the same closure scope)

---

## Files to modify (5 files, 1 DB command)
1. Project root — Remove stale `C:UsersPheo.claudeplans` directory
2. `supabase/migrations/20260427_create_minna_vocabulary.sql` — Run via Supabase after dropping table
3. `src/types/vocabulary.ts` — Optionally align VocabWord fields
4. `src/hooks/useFlashcardFolders.ts` — Fix `any` cast, align types
5. `src/services/vocabularyService.ts` — Add re-exports
6. `src/components/vocabulary/KanjiStudyOverlay.tsx` — Hoist `handleQuizAnswer`

## Verification
1. Confirm stale directory removed from project root
2. Confirm vocabulary table exists with `lesson` column
3. Run diagnostics on modified TS files — no type errors
4. Verify `InsertVocabulary` and `UpdateVocabulary` are importable from `@/services/vocabularyService`
5. Verify `KanjiStudyOverlay.tsx` has no hoisting warnings
6. Check `useFlashcardFolders.ts` no longer uses `as any` casts for VocabWord
