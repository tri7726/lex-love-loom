import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { UserCache } from '../../common/cache/user-cache';
import type {
  CreateFlashcardDto,
  CreateFolderDto,
  FlashcardListQueryDto,
  FlashcardRow,
  UpdateFlashcardDto,
  UpdateFolderDto,
} from './dto/flashcard.dto';

const T_CARDS = 'flashcards';
const T_FOLDERS = 'vocabulary_folders';
const T_FOLDER_ITEMS = 'vocabulary_folder_items';

interface FolderRow {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  description: string | null;
  jlpt_level: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FolderWithCards extends FolderRow {
  cards: FlashcardRow[];
}

@Injectable()
export class FlashcardService {
  /** Cache namespaces: `cards|...`, `folders`, `folder|<id>`. */
  private cache = new UserCache<unknown>({ ttlMs: 30_000, maxPerUser: 32 });

  constructor(private readonly supabase: SupabaseService) {}

  private client(jwt: string) {
    return this.supabase.forUser(jwt);
  }

  // ─── Cards ────────────────────────────────────────────────────────────────

  async listCards(
    userId: string,
    jwt: string,
    q: FlashcardListQueryDto,
  ): Promise<FlashcardRow[]> {
    const key = `cards|${q.limit}|${q.offset}|${q.search ?? ''}|${q.jlpt_level ?? ''}|${q.due_before ?? ''}`;
    const hit = this.cache.get(userId, key) as FlashcardRow[] | undefined;
    if (hit) return hit;

    let query = this.client(jwt)
      .from(T_CARDS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(q.offset, q.offset + q.limit - 1);

    if (q.search) {
      query = query.or(
        `word.ilike.%${q.search}%,meaning.ilike.%${q.search}%,reading.ilike.%${q.search}%`,
      );
    }
    if (q.jlpt_level) query = query.eq('jlpt_level', q.jlpt_level);
    if (q.due_before) query = query.lte('due', q.due_before);

    const { data, error } = await query;
    if (error) throw new InternalServerErrorException(error.message);
    const rows = (data ?? []) as FlashcardRow[];
    this.cache.set(userId, key, rows);
    return rows;
  }

  async getCard(userId: string, jwt: string, id: string): Promise<FlashcardRow> {
    const { data, error } = await this.client(jwt)
      .from(T_CARDS)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Flashcard not found');
    return data as FlashcardRow;
  }

  async createCard(
    userId: string,
    jwt: string,
    dto: CreateFlashcardDto,
  ): Promise<FlashcardRow> {
    const { data, error } = await this.client(jwt)
      .from(T_CARDS)
      .insert({ ...dto, user_id: userId })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidatePrefix(userId, 'cards|');
    return data as FlashcardRow;
  }

  async updateCard(
    userId: string,
    jwt: string,
    id: string,
    dto: UpdateFlashcardDto,
  ): Promise<FlashcardRow> {
    const { data, error } = await this.client(jwt)
      .from(T_CARDS)
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Flashcard not found');
    this.cache.invalidatePrefix(userId, 'cards|');
    this.cache.invalidatePrefix(userId, 'folder|');
    return data as FlashcardRow;
  }

  async deleteCard(userId: string, jwt: string, id: string): Promise<void> {
    const { error } = await this.client(jwt)
      .from(T_CARDS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
  }

  // ─── Folders ──────────────────────────────────────────────────────────────

  async listFolders(userId: string, jwt: string): Promise<FolderWithCards[]> {
    const hit = this.cache.get(userId, 'folders') as FolderWithCards[] | undefined;
    if (hit) return hit;

    const cli = this.client(jwt);
    const { data: folderData, error: folderErr } = await cli
      .from(T_FOLDERS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (folderErr) throw new InternalServerErrorException(folderErr.message);
    const folders = (folderData ?? []) as FolderRow[];
    if (folders.length === 0) {
      this.cache.set(userId, 'folders', []);
      return [];
    }

    const folderIds = folders.map((f) => f.id);
    const { data: itemRows, error: itemErr } = await cli
      .from(T_FOLDER_ITEMS)
      .select('folder_id, flashcards (*)')
      .in('folder_id', folderIds);
    if (itemErr) throw new InternalServerErrorException(itemErr.message);

    const byFolder = new Map<string, FlashcardRow[]>();
    for (const row of (itemRows ?? []) as Array<{
      folder_id: string;
      flashcards: FlashcardRow | null;
    }>) {
      if (!row.flashcards) continue;
      const arr = byFolder.get(row.folder_id) ?? [];
      arr.push(row.flashcards);
      byFolder.set(row.folder_id, arr);
    }

    const result: FolderWithCards[] = folders.map((f) => ({
      ...f,
      cards: byFolder.get(f.id) ?? [],
    }));
    this.cache.set(userId, 'folders', result);
    return result;
  }

  async createFolder(
    userId: string,
    jwt: string,
    dto: CreateFolderDto,
  ): Promise<FolderRow> {
    const { data, error } = await this.client(jwt)
      .from(T_FOLDERS)
      .insert({ ...dto, user_id: userId })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
    return data as FolderRow;
  }

  async updateFolder(
    userId: string,
    jwt: string,
    id: string,
    dto: UpdateFolderDto,
  ): Promise<FolderRow> {
    const { data, error } = await this.client(jwt)
      .from(T_FOLDERS)
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Folder not found');
    this.cache.invalidate(userId);
    return data as FolderRow;
  }

  async deleteFolder(userId: string, jwt: string, id: string): Promise<void> {
    const { error } = await this.client(jwt)
      .from(T_FOLDERS)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
  }

  /** Add an existing card to a folder (the card must belong to the user). */
  async addCardToFolder(
    userId: string,
    jwt: string,
    folderId: string,
    flashcardId: string,
  ): Promise<{ folder_id: string; flashcard_id: string }> {
    const cli = this.client(jwt);
    // Defense-in-depth: verify ownership before inserting the link row.
    const { data: card } = await cli
      .from(T_CARDS)
      .select('id')
      .eq('id', flashcardId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!card) throw new NotFoundException('Flashcard not found');

    const { data: folder } = await cli
      .from(T_FOLDERS)
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!folder) throw new NotFoundException('Folder not found');

    const { error } = await cli
      .from(T_FOLDER_ITEMS)
      .insert({ folder_id: folderId, flashcard_id: flashcardId });
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
    return { folder_id: folderId, flashcard_id: flashcardId };
  }

  async removeCardFromFolder(
    userId: string,
    jwt: string,
    folderId: string,
    flashcardId: string,
  ): Promise<void> {
    // Ownership of the folder is enough — the link row has no user_id column.
    const cli = this.client(jwt);
    const { data: folder } = await cli
      .from(T_FOLDERS)
      .select('id')
      .eq('id', folderId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!folder) throw new NotFoundException('Folder not found');

    const { error } = await cli
      .from(T_FOLDER_ITEMS)
      .delete()
      .eq('folder_id', folderId)
      .eq('flashcard_id', flashcardId);
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
  }
}
