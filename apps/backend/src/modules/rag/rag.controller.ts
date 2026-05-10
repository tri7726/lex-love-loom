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
  @ApiOperation({ summary: 'Retrieve relevant chunks for a query (RAG)' })
  @UsePipes(new ZodValidationPipe(RagQuerySchema))
  query(@CurrentUser() user: AuthUser, @Body() dto: RagQueryDto) {
    return this.rag.query(user.id, dto);
  }
}
