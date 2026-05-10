import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AnalyzeSpeechDto, AnalyzeSpeechSchema } from './dto/analyze.dto';
import { SpeakingService } from './speaking.service';

@ApiTags('speaking')
@ApiBearerAuth()
@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speaking: SpeakingService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze speech against reference text' })
  @UsePipes(new ZodValidationPipe(AnalyzeSpeechSchema))
  analyze(@Body() dto: AnalyzeSpeechDto) {
    return this.speaking.analyze(dto);
  }
}
