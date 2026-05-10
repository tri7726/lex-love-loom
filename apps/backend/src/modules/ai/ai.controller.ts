import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  DeepExplainResult,
  ExplainDto,
  ExplainSchema,
} from './dto/explain.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  /**
   * Non-streaming structured explain (Wave 1 of ADR 003).
   * Same input/output shape as the legacy Edge Function `ai-explain`,
   * so the frontend can flip `VITE_USE_NESTJS_AI_EXPLAIN` without code changes.
   */
  @Post('explain')
  @ApiOperation({
    summary: 'Deep step-by-step explanation (grammar/vocab/kanji)',
    description:
      'Returns a structured DeepExplainResult JSON. Mirrors the Edge Function `ai-explain` contract.',
  })
  @UsePipes(new ZodValidationPipe(ExplainSchema))
  async explain(@Body() dto: ExplainDto): Promise<DeepExplainResult> {
    return this.ai.explain(dto);
  }
}
