/** Re-export the unified Zod schemas from `packages/types` so the controller
 *  can wire them into `ZodValidationPipe` and infer DTO types in one place. */
export {
  UpsertVocabularySchema,
  type UpsertVocabularyDto,
  UpdateVocabularySchema,
  type UpdateVocabularyDto,
  VocabularyListQuerySchema,
  type VocabularyListQueryDto,
  type SavedVocabularyRow,
} from '@lex-love-loom/types';
