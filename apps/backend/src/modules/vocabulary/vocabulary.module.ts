import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../common/supabase/supabase.module';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VocabularyController],
  providers: [VocabularyService],
})
export class VocabularyModule {}
