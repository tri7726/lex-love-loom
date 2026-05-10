import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  UpdateVocabularySchema,
  type UpdateVocabularyDto,
  UpsertVocabularySchema,
  type UpsertVocabularyDto,
  VocabularyListQuerySchema,
  type VocabularyListQueryDto,
} from './dto/vocabulary.dto';
import { VocabularyService } from './vocabulary.service';

/**
 * REST CRUD over the user's `saved_vocabulary` table.
 * All endpoints are auth-scoped: the JWT subject (`req.user.id`) is the only
 * `user_id` ever written/queried. The Supabase client is also created with the
 * user's JWT, so RLS still applies as a defense-in-depth check.
 */
@ApiTags('vocabulary')
@ApiBearerAuth()
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly svc: VocabularyService) {}

  private extractJwt(req: { headers: Record<string, string | string[]> }): string {
    const h = req.headers.authorization as string | undefined;
    if (!h?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    return h.slice(7);
  }

  @Get()
  @ApiOperation({ summary: 'List saved vocabulary for the current user' })
  @UsePipes(new ZodValidationPipe(VocabularyListQuerySchema))
  async list(
    @Query() q: VocabularyListQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.list(user.id, this.extractJwt(req), q);
  }

  @Get(':id')
  async getOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.getById(user.id, this.extractJwt(req), id);
  }

  @Post()
  @ApiOperation({ summary: 'Upsert a saved word (conflict on user_id + word)' })
  @UsePipes(new ZodValidationPipe(UpsertVocabularySchema))
  async upsert(
    @Body() dto: UpsertVocabularyDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.upsert(user.id, this.extractJwt(req), dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateVocabularySchema)) dto: UpdateVocabularyDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.update(user.id, this.extractJwt(req), id, dto);
  }

  @Delete(':id')
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    await this.svc.remove(user.id, this.extractJwt(req), id);
    return { ok: true };
  }
}
