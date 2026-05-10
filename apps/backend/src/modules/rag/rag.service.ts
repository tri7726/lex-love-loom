import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { RagQueryDto } from './dto/query.dto';

interface KnowledgeRow {
  content: string;
  source_type: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

interface ScoredItem extends KnowledgeRow {
  similarity: number;
}

@Injectable()
export class RagService {
  private readonly log = new Logger(RagService.name);
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Retrieve the user's RAG context for a query.
   * Uses the same keyword + recency scoring as the Edge `sensei-rag`
   * `retrieve` action so the response shape is drop-in compatible.
   */
  async query(authUserId: string, dto: RagQueryDto): Promise<{ context: ScoredItem[] }> {
    if (authUserId !== dto.user_id) {
      throw new ForbiddenException('user_id mismatch');
    }
    const db = this.supabase.admin;

    // Profile snapshot
    const { data: profileData } = await db
      .from('sensei_knowledge')
      .select('content, source_type, metadata')
      .eq('user_id', dto.user_id)
      .eq('source_type', 'profile')
      .order('created_at', { ascending: false })
      .limit(1);

    // Recent knowledge entries (last 50)
    const { data: allKnowledge } = await db
      .from('sensei_knowledge')
      .select('content, source_type, metadata, created_at')
      .eq('user_id', dto.user_id)
      .neq('source_type', 'profile')
      .order('created_at', { ascending: false })
      .limit(50);

    const queryLower = dto.query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 1);

    const scored = (allKnowledge ?? []).map((item) => {
      const row = item as KnowledgeRow;
      const contentLower = row.content.toLowerCase();
      let score = 0;
      if (contentLower.includes(queryLower)) score += 5;
      for (const w of queryWords) if (contentLower.includes(w)) score += 1;
      const ageMs = row.created_at ? Date.now() - new Date(row.created_at).getTime() : 0;
      const ageDays = ageMs / 86_400_000;
      if (ageDays < 7) score *= 1.3;
      else if (ageDays < 30) score *= 1.15;
      else if (ageDays > 90) score *= 0.85;
      return { ...row, similarity: score } as ScoredItem;
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    const top = scored.filter((s) => s.similarity > 0).slice(0, dto.topK ?? 5);

    const context: ScoredItem[] = [];
    if (profileData && profileData.length > 0) {
      const p = profileData[0] as KnowledgeRow;
      context.push({ ...p, similarity: 1.0 });
    }
    context.push(...top);
    return { context };
  }
}
