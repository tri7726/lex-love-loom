import { Injectable, NotImplementedException } from '@nestjs/common';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { RagQueryDto } from './dto/query.dto';

@Injectable()
export class RagService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * TODO (Tuần 4): port from supabase/functions/sensei-rag.
   * Will: embed query (Lovable AI), call match_rag_documents() RPC, rank, return top-K.
   */
  async query(_userId: string, _dto: RagQueryDto) {
    throw new NotImplementedException('rag.query: pending migration');
  }
}
