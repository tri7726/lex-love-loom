# Setup Instructions for Lovable

## Project Overview

Japanese learning app with new 3-tier flashcard management system.

## Recent Changes

Added flashcard management system with:

- Database migration:
  `supabase/migrations/20260207220439_create_flashcard_system.sql`
- 3 new pages: ModuleManager, FolderManager, FlashcardReview
- SRS algorithm implementation

## TODO: Type Generation Required

**Issue:** TypeScript types not regenerated after migration.

**Fix Needed:**

```bash
npx supabase gen types typescript --project-id ojbwbbqmqxyxwwujzokm > src/integrations/supabase/types.ts
```

This will fix all TypeScript lint errors in:

- `src/pages/ModuleManager.tsx`
- `src/pages/FolderManager.tsx`
- `src/pages/FlashcardReview.tsx`
- `src/components/FlashcardSRS.tsx`

## Environment Setup

Copy `.env.example` to `.env` and add:

```
VITE_SUPABASE_PROJECT_ID="ojbwbbqmqxyxwwujzokm"
VITE_SUPABASE_PUBLISHABLE_KEY="[from Supabase Dashboard]"
VITE_SUPABASE_URL="https://ojbwbbqmqxyxwwujzokm.supabase.co"
```

## Installation

```bash
npm install
npm run dev
```

## Supabase Setup

Migration already applied to project `ojbwbbqmqxyxwwujzokm`.

Tables created:

- `course_modules` - Course organization (N5, N4, etc.)
- `vocabulary_folders` - Nested folder structure
- `flashcards` - Flashcards with SRS fields
- `vocabulary_folder_items` - Many-to-many junction

## Testing Routes

After type generation, test:

- `/module-manager` - Create/manage course modules
- `/folder-manager` - Create/manage folders
- `/flashcard-review` - SRS review session

## Documentation

See `walkthrough.md` in artifacts folder for complete implementation details.
