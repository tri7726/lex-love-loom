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
  AddCardToFolderSchema,
  type AddCardToFolderDto,
  CreateFlashcardSchema,
  type CreateFlashcardDto,
  CreateFolderSchema,
  type CreateFolderDto,
  FlashcardListQuerySchema,
  type FlashcardListQueryDto,
  UpdateFlashcardSchema,
  type UpdateFlashcardDto,
  UpdateFolderSchema,
  type UpdateFolderDto,
} from './dto/flashcard.dto';
import { FlashcardService } from './flashcard.service';

/**
 * REST routes for SRS flashcards (`flashcards` table) and folder management
 * (`vocabulary_folders` + `vocabulary_folder_items`). All endpoints are
 * auth-scoped to the JWT subject.
 */
@ApiTags('flashcards')
@ApiBearerAuth()
@Controller('flashcards')
export class FlashcardController {
  constructor(private readonly svc: FlashcardService) {}

  private extractJwt(req: { headers: Record<string, string | string[]> }): string {
    const h = req.headers.authorization as string | undefined;
    if (!h?.startsWith('Bearer ')) throw new UnauthorizedException('Missing bearer token');
    return h.slice(7);
  }

  // ─── Cards ────────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List the user’s flashcards (filterable)' })
  @UsePipes(new ZodValidationPipe(FlashcardListQuerySchema))
  async listCards(
    @Query() q: FlashcardListQueryDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.listCards(user.id, this.extractJwt(req), q);
  }

  @Get(':id')
  async getCard(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.getCard(user.id, this.extractJwt(req), id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(CreateFlashcardSchema))
  async createCard(
    @Body() dto: CreateFlashcardDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.createCard(user.id, this.extractJwt(req), dto);
  }

  @Patch(':id')
  async updateCard(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateFlashcardSchema)) dto: UpdateFlashcardDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.updateCard(user.id, this.extractJwt(req), id, dto);
  }

  @Delete(':id')
  async deleteCard(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    await this.svc.deleteCard(user.id, this.extractJwt(req), id);
    return { ok: true };
  }

  // ─── Folders ──────────────────────────────────────────────────────────────

  @Get('folders/all')
  @ApiOperation({
    summary: 'List the user’s folders with embedded cards (single round-trip)',
  })
  async listFolders(
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.listFolders(user.id, this.extractJwt(req));
  }

  @Post('folders')
  @UsePipes(new ZodValidationPipe(CreateFolderSchema))
  async createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.createFolder(user.id, this.extractJwt(req), dto);
  }

  @Patch('folders/:id')
  async updateFolder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateFolderSchema)) dto: UpdateFolderDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.updateFolder(user.id, this.extractJwt(req), id, dto);
  }

  @Delete('folders/:id')
  async deleteFolder(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    await this.svc.deleteFolder(user.id, this.extractJwt(req), id);
    return { ok: true };
  }

  @Post('folders/:id/cards')
  async addCardToFolder(
    @Param('id', new ParseUUIDPipe()) folderId: string,
    @Body(new ZodValidationPipe(AddCardToFolderSchema)) dto: AddCardToFolderDto,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    return this.svc.addCardToFolder(
      user.id,
      this.extractJwt(req),
      folderId,
      dto.flashcard_id,
    );
  }

  @Delete('folders/:id/cards/:cardId')
  async removeCardFromFolder(
    @Param('id', new ParseUUIDPipe()) folderId: string,
    @Param('cardId', new ParseUUIDPipe()) cardId: string,
    @CurrentUser() user: AuthUser,
    @Req() req: { headers: Record<string, string | string[]> },
  ) {
    await this.svc.removeCardFromFolder(
      user.id,
      this.extractJwt(req),
      folderId,
      cardId,
    );
    return { ok: true };
  }
}
