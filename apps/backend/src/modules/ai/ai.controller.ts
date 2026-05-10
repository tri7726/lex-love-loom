import { Body, Controller, Post, Res, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ExplainDto, ExplainSchema } from './dto/explain.dto';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('explain')
  @ApiOperation({ summary: 'Stream AI explanation (Server-Sent Events)' })
  @UsePipes(new ZodValidationPipe(ExplainSchema))
  async explain(@Body() dto: ExplainDto, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of this.ai.streamExplain(dto)) {
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
    } catch (err) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: (err as Error).message,
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  }
}
