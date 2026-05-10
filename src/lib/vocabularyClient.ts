/**
 * Feature-flagged client for the user's saved vocabulary (`saved_vocabulary` table).
 *
 * Routes through:
 *  - NestJS REST `/vocabulary/*` when `VITE_USE_NESTJS_DATA === "true"`
 *  - Supabase JS client otherwise (legacy path).
 *
 * Both paths return the same row shape so call sites stay agnostic.
 */
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/apiClient";

export interface SavedVocabulary {
  id: string;
  user_id: string;
  word: string;
  reading?: string | null;
  meaning: string;
  example_sentence?: string | null;
  mastery_level?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UpsertVocabularyInput {
  word: string;
  reading?: string | null;
  meaning: string;
  example_sentence?: string | null;
  mastery_level?: number;
}

export interface ListVocabularyInput {
  limit?: number;
  offset?: number;
  search?: string;
}

const useNestJs =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_USE_NESTJS_DATA ??
    "false") === "true";

export const vocabularyBackend = useNestJs ? "nestjs" : "supabase";

export async function listVocabulary(
  userId: string,
  q: ListVocabularyInput = {},
): Promise<SavedVocabulary[]> {
  if (useNestJs) {
    const params = new URLSearchParams();
    if (q.limit != null) params.set("limit", String(q.limit));
    if (q.offset != null) params.set("offset", String(q.offset));
    if (q.search) params.set("search", q.search);
    const qs = params.toString();
    return apiFetch<SavedVocabulary[]>(`/vocabulary${qs ? `?${qs}` : ""}`);
  }

  let query = supabase
    .from("saved_vocabulary")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (q.limit != null) query = query.range(q.offset ?? 0, (q.offset ?? 0) + q.limit - 1);
  if (q.search) {
    query = query.or(`word.ilike.%${q.search}%,meaning.ilike.%${q.search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SavedVocabulary[];
}

export async function upsertVocabulary(
  userId: string,
  dto: UpsertVocabularyInput,
): Promise<SavedVocabulary> {
  if (useNestJs) {
    return apiFetch<SavedVocabulary>("/vocabulary", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }
  const { data, error } = await supabase
    .from("saved_vocabulary")
    .upsert({ ...dto, user_id: userId } as never, { onConflict: "user_id,word" })
    .select()
    .single();
  if (error) throw error;
  return data as SavedVocabulary;
}

export async function updateVocabulary(
  userId: string,
  id: string,
  dto: Partial<UpsertVocabularyInput>,
): Promise<SavedVocabulary> {
  if (useNestJs) {
    return apiFetch<SavedVocabulary>(`/vocabulary/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }
  const { data, error } = await supabase
    .from("saved_vocabulary")
    .update(dto as never)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as SavedVocabulary;
}

export async function deleteVocabulary(userId: string, id: string): Promise<void> {
  if (useNestJs) {
    await apiFetch<{ ok: true }>(`/vocabulary/${id}`, { method: "DELETE" });
    return;
  }
  const { error } = await supabase
    .from("saved_vocabulary")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
