import { Injectable, NotImplementedException } from '@nestjs/common';
import { GrammarQuizDto } from './dto/grammar-quiz.dto';

@Injectable()
export class QuizService {
  /**
   * TODO (Tuần 3): port logic from supabase/functions/generate-grammar-quiz.
   * Will: pull templates from DB, call Lovable AI Gateway, validate shape, cache by (level,topic).
   */
  async generateGrammarQuiz(_dto: GrammarQuizDto) {
    throw new NotImplementedException('generateGrammarQuiz: pending migration');
  }
}
