import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { UserCache } from '../../common/cache/user-cache';
import type {
  SavedVocabularyRow,
  UpdateVocabularyDto,
  UpsertVocabularyDto,
  VocabularyListQueryDto,
} from './dto/vocabulary.dto';

const TABLE = 'saved_vocabulary';

@Injectable()
export class VocabularyService {
  /** Cache list-results per user for 30s. Invalidated on any mutation. */
  private cache = new UserCache<SavedVocabularyRow[]>({
    ttlMs: 30_000,
    maxPerUser: 16,
  });

  constructor(private readonly supabase: SupabaseService) {}

  private client(jwt: string) {
    return this.supabase.forUser(jwt);
  }

  async list(
    userId: string,
    jwt: string,
    q: VocabularyListQueryDto,
  ): Promise<SavedVocabularyRow[]> {
    const key = `list|${q.limit}|${q.offset}|${q.search ?? ''}`;
    const hit = this.cache.get(userId, key);
    if (hit) return hit;

    let query = this.client(jwt)
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(q.offset, q.offset + q.limit - 1);

    if (q.search) {
      // ilike is index-friendly enough for our small per-user dataset.
      query = query.or(`word.ilike.%${q.search}%,meaning.ilike.%${q.search}%`);
    }

    const { data, error } = await query;
    if (error) throw new InternalServerErrorException(error.message);
    const rows = (data ?? []) as SavedVocabularyRow[];
    this.cache.set(userId, key, rows);
    return rows;
  }

  async getById(
    userId: string,
    jwt: string,
    id: string,
  ): Promise<SavedVocabularyRow> {
    const { data, error } = await this.client(jwt)
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Word not found');
    return data as SavedVocabularyRow;
  }

  /** Upsert by (user_id, word) — mirrors the legacy FE behaviour. */
  async upsert(
    userId: string,
    jwt: string,
    dto: UpsertVocabularyDto,
  ): Promise<SavedVocabularyRow> {
    const { data, error } = await this.client(jwt)
      .from(TABLE)
      .upsert({ ...dto, user_id: userId }, { onConflict: 'user_id,word' })
      .select()
      .single();
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
    return data as SavedVocabularyRow;
  }

  async update(
    userId: string,
    jwt: string,
    id: string,
    dto: UpdateVocabularyDto,
  ): Promise<SavedVocabularyRow> {
    const { data, error } = await this.client(jwt)
      .from(TABLE)
      .update(dto)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) throw new InternalServerErrorException(error.message);
    if (!data) throw new NotFoundException('Word not found');
    this.cache.invalidate(userId);
    return data as SavedVocabularyRow;
  }

  async remove(userId: string, jwt: string, id: string): Promise<void> {
    const { error } = await this.client(jwt)
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw new InternalServerErrorException(error.message);
    this.cache.invalidate(userId);
  }
}
