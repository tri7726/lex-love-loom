/**
 * Thin facade over `vocabularyClient` so existing call sites keep working
 * while the underlying transport switches between NestJS and Supabase via
 * the `VITE_USE_NESTJS_DATA` flag.
 */
import {
  deleteVocabulary,
  listVocabulary,
  updateVocabulary,
  upsertVocabulary,
  type SavedVocabulary as ClientSavedVocabulary,
  type UpsertVocabularyInput,
} from "@/lib/vocabularyClient";

import type {
  InsertVocabulary,
  SavedVocabulary,
  UpdateVocabulary,
} from "@/types/vocabulary";

function toUpsertInput(word: InsertVocabulary): UpsertVocabularyInput {
  return {
    word: word.word,
    reading: word.reading ?? null,
    meaning: word.meaning,
    example_sentence: word.example_sentence ?? null,
    mastery_level: word.mastery_level ?? undefined,
  };
}

export const vocabularyService = {
  async getSavedVocabulary(userId: string): Promise<ClientSavedVocabulary[]> {
    return listVocabulary(userId, { limit: 500 });
  },

  async upsertWord(word: InsertVocabulary): Promise<ClientSavedVocabulary> {
    return upsertVocabulary(word.user_id, toUpsertInput(word));
  },

  async deleteWord(id: string, userId: string): Promise<true> {
    await deleteVocabulary(userId, id);
    return true;
  },

  async updateWord(
    id: string,
    userId: string,
    updates: UpdateVocabulary,
  ): Promise<ClientSavedVocabulary> {
    return updateVocabulary(userId, id, updates as Partial<UpsertVocabularyInput>);
  },
};

export type { InsertVocabulary, UpdateVocabulary, SavedVocabulary } from "@/types/vocabulary";
