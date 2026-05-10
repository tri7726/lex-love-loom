import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { RagQueryDto, RagQuerySchema } from './dto/query.dto';
import { RagService } from './rag.service';

@ApiTags('rag')
@ApiBearerAuth()
@Controller('rag')
export class RagController {
  constructor(private readonly rag: RagService) {}

  @Post('query')
  @ApiOperation({
    summary: 'Retrieve RAG context for a query (sensei-rag retrieve)',
    description:
      'Returns `{ context: ScoredItem[] }` — drop-in replacement for the Edge `sensei-rag` retrieve action.',
  })
  @UsePipes(new ZodValidationPipe(RagQuerySchema))
  query(@CurrentUser() user: AuthUser, @Body() dto: RagQueryDto) {
    return this.rag.query(user.id, dto);
  }
}
