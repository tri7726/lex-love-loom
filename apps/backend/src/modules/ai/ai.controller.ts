import { Body, Controller, Post, Res, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

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
   * Same input/output shape as the legacy Edge Function `ai-explain`.
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

  /**
   * Streaming variant (Wave 2). Server-Sent Events:
   *   data: {"type":"token","content":"..."}
   *   data: {"type":"result","data":{...}}
   *   data: {"type":"done"} / [DONE]
   */
  @Post('explain/stream')
  @ApiOperation({ summary: 'Stream the deep explanation token-by-token (SSE)' })
  @UsePipes(new ZodValidationPipe(ExplainSchema))
  async explainStream(
    @Body() dto: ExplainDto,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const stream = await this.ai.explainStream(dto);
    stream.on('data', (chunk) => res.write(chunk));
    stream.on('end', () => res.end());
    stream.on('error', (err) => {
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: (err as Error).message })}\n\n`,
      );
      res.end();
    });
  }
}
