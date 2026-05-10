/**
 * Feature-flagged client for the user's flashcards + folders.
 *
 * Routes through:
 *  - NestJS REST `/flashcards/*` when `VITE_USE_NESTJS_DATA === "true"`
 *  - Supabase JS client otherwise.
 *
 * Folders are returned with embedded `cards` to avoid an N+1 in the UI.
 */
import { supabase } from "@/integrations/supabase/client";
import { apiFetch } from "@/lib/apiClient";

export interface FlashcardRow {
  id: string;
  user_id: string;
  word: string;
  reading?: string | null;
  hanviet?: string | null;
  meaning: string;
  example_sentence?: string | null;
  example_translation?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  jlpt_level?: string | null;
  word_type?: string | null;
  tags?: string[] | null;
  ease_factor?: number | null;
  interval?: number | null;
  repetitions?: number | null;
  next_review_date?: string | null;
  last_reviewed_at?: string | null;
  state?: number | null;
  reps?: number | null;
  lapses?: number | null;
  due?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  description?: string | null;
  jlpt_level?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FolderWithCards extends FolderRow {
  cards: FlashcardRow[];
}

export interface CreateFlashcardInput {
  word: string;
  reading?: string | null;
  hanviet?: string | null;
  meaning: string;
  example_sentence?: string | null;
  example_translation?: string | null;
  audio_url?: string | null;
  image_url?: string | null;
  notes?: string | null;
  jlpt_level?: string | null;
  word_type?: string | null;
  tags?: string[] | null;
}

export interface ListFlashcardsInput {
  limit?: number;
  offset?: number;
  search?: string;
  jlpt_level?: string;
  due_before?: string;
}

const useNestJs =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_USE_NESTJS_DATA ??
    "false") === "true";

export const flashcardBackend = useNestJs ? "nestjs" : "supabase";

// ─── Cards ──────────────────────────────────────────────────────────────────

export async function listFlashcards(
  userId: string,
  q: ListFlashcardsInput = {},
): Promise<FlashcardRow[]> {
  if (useNestJs) {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.set(k, String(v));
    });
    const qs = params.toString();
    return apiFetch<FlashcardRow[]>(`/flashcards${qs ? `?${qs}` : ""}`);
  }
  let query = supabase
    .from("flashcards")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (q.limit != null) query = query.range(q.offset ?? 0, (q.offset ?? 0) + q.limit - 1);
  if (q.search) {
    query = query.or(
      `word.ilike.%${q.search}%,meaning.ilike.%${q.search}%,reading.ilike.%${q.search}%`,
    );
  }
  if (q.jlpt_level) query = query.eq("jlpt_level", q.jlpt_level);
  if (q.due_before) query = query.lte("due", q.due_before);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FlashcardRow[];
}

export async function createFlashcard(
  userId: string,
  dto: CreateFlashcardInput,
): Promise<FlashcardRow> {
  if (useNestJs) {
    return apiFetch<FlashcardRow>("/flashcards", {
      method: "POST",
      body: JSON.stringify(dto),
    });
  }
  const { data, error } = await supabase
    .from("flashcards")
    .insert({ ...dto, user_id: userId } as never)
    .select()
    .single();
  if (error) throw error;
  return data as FlashcardRow;
}

export async function updateFlashcard(
  userId: string,
  id: string,
  dto: Partial<CreateFlashcardInput>,
): Promise<FlashcardRow> {
  if (useNestJs) {
    return apiFetch<FlashcardRow>(`/flashcards/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }
  const { data, error } = await supabase
    .from("flashcards")
    .update(dto as never)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as FlashcardRow;
}

export async function deleteFlashcard(userId: string, id: string): Promise<void> {
  if (useNestJs) {
    await apiFetch<{ ok: true }>(`/flashcards/${id}`, { method: "DELETE" });
    return;
  }
  const { error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ─── Folders ────────────────────────────────────────────────────────────────

export async function listFolders(userId: string): Promise<FolderWithCards[]> {
  if (useNestJs) {
    return apiFetch<FolderWithCards[]>("/flashcards/folders/all");
  }
  const { data: folders, error } = await supabase
    .from("vocabulary_folders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!folders?.length) return [];
  const ids = folders.map((f) => f.id);
  const { data: items, error: itemErr } = await supabase
    .from("vocabulary_folder_items")
    .select("folder_id, flashcards(*)")
    .in("folder_id", ids);
  if (itemErr) throw itemErr;
  const byFolder = new Map<string, FlashcardRow[]>();
  for (const row of (items ?? []) as Array<{
    folder_id: string;
    flashcards: FlashcardRow | null;
  }>) {
    if (!row.flashcards) continue;
    const arr = byFolder.get(row.folder_id) ?? [];
    arr.push(row.flashcards);
    byFolder.set(row.folder_id, arr);
  }
  return folders.map((f) => ({
    ...(f as FolderRow),
    cards: byFolder.get(f.id) ?? [],
  }));
}

export async function createFolder(
  userId: string,
  input: { name: string; icon?: string; description?: string | null; jlpt_level?: string | null },
): Promise<FolderRow> {
  if (useNestJs) {
    return apiFetch<FolderRow>("/flashcards/folders", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }
  const { data, error } = await supabase
    .from("vocabulary_folders")
    .insert({ ...input, user_id: userId } as never)
    .select()
    .single();
  if (error) throw error;
  return data as FolderRow;
}

export async function deleteFolder(userId: string, id: string): Promise<void> {
  if (useNestJs) {
    await apiFetch<{ ok: true }>(`/flashcards/folders/${id}`, { method: "DELETE" });
    return;
  }
  const { error } = await supabase
    .from("vocabulary_folders")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function addCardToFolder(
  folderId: string,
  flashcardId: string,
): Promise<void> {
  if (useNestJs) {
    await apiFetch(`/flashcards/folders/${folderId}/cards`, {
      method: "POST",
      body: JSON.stringify({ flashcard_id: flashcardId }),
    });
    return;
  }
  const { error } = await supabase
    .from("vocabulary_folder_items")
    .insert({ folder_id: folderId, flashcard_id: flashcardId } as never);
  if (error) throw error;
}

export async function removeCardFromFolder(
  folderId: string,
  flashcardId: string,
): Promise<void> {
  if (useNestJs) {
    await apiFetch(`/flashcards/folders/${folderId}/cards/${flashcardId}`, {
      method: "DELETE",
    });
    return;
  }
  const { error } = await supabase
    .from("vocabulary_folder_items")
    .delete()
    .eq("folder_id", folderId)
    .eq("flashcard_id", flashcardId);
  if (error) throw error;
}
