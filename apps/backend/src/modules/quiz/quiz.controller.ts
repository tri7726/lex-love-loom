import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { GrammarQuizDto, GrammarQuizSchema } from './dto/grammar-quiz.dto';
import { QuizService } from './quiz.service';

@ApiTags('quiz')
@ApiBearerAuth()
@Controller('quiz')
export class QuizController {
  constructor(private readonly quiz: QuizService) {}

  @Post('grammar')
  @ApiOperation({ summary: 'Generate JLPT grammar quiz' })
  @UsePipes(new ZodValidationPipe(GrammarQuizSchema))
  generateGrammar(@Body() dto: GrammarQuizDto) {
    return this.quiz.generateGrammarQuiz(dto);
  }
}
