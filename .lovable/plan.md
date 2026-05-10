## Mục tiêu
Audit lại flow `Frontend → aiExplainClient → (NestJS | Edge) → AI Gateway` sau khi đã refactor `deepExplain()`. Phát hiện và fix các mismatch để cờ `VITE_USE_NESTJS_AI_EXPLAIN=true` thực sự hoạt động end-to-end.

## Vấn đề phát hiện được

### 1. DTO mismatch (BLOCKER) — request sẽ bị Zod 400
- FE `aiExplainClient` gửi: `{ prompt, context }`
- NestJS `ExplainSchema` (apps/backend) yêu cầu: `{ text, context, language, model }` — **field `text` required**, không có `prompt`
- Shared `packages/types` lại định nghĩa thứ ba: `{ prompt, level, context }`
- Edge function nhận: `{ question, context, explain_type }`
→ Ba schema khác nhau cho cùng 1 endpoint.

### 2. Response shape mismatch (BLOCKER) — JSON.parse sẽ throw
- NestJS stream **plain Vietnamese text** (system prompt: "giải thích ngắn gọn")
- FE `explain()` gom hết delta rồi `JSON.parse(full)` mong đợi object `{ reasoning_steps, conclusion, difficulty, related_patterns, ... }`
- Edge function trả JSON object có cấu trúc trên (non-stream mode)
→ Khi bật cờ NestJS: chắc chắn lỗi "non-JSON payload".

### 3. Mất `explain_type`
- FE map `explain_type` = `'grammar' | 'vocab' | 'kanji'` nhưng NestJS DTO không có field này → ngữ cảnh bị mất, prompt sinh ra không phân loại được.

### 4. `VITE_BACKEND_URL` mặc định `localhost:3001`
- Trong preview Lovable, FE chạy trên domain `*.lovable.app` → fetch `localhost:3001` sẽ fail. Cần document/cảnh báo phải set khi bật cờ.

### 5. JwtAuthGuard global — `/ai/explain` yêu cầu Bearer
- Đã đúng (FE gửi Supabase access_token trong `streamSSE`), nhưng cần verify JWKS URL đã có trong env Railway.

## Phương án fix (đề xuất)

### Phương án A — Thống nhất theo contract của Edge (đỡ phải sửa FE nhiều)
Chuẩn hoá tất cả về `{ question, context, explain_type }` + response JSON cùng schema `DeepExplainResult`.

1. **packages/types**: Sửa `ExplainSchema` thành
   ```ts
   { question: string, context?: string, explain_type?: 'grammar'|'vocab'|'kanji'|'error'|'pattern' }
   ```
   Thêm `DeepExplainResultSchema` (reasoning_steps, conclusion, difficulty, related_patterns, mnemonics?, common_mistakes?, model_used?).

2. **apps/backend/ai/dto/explain.dto.ts**: Re-export từ `packages/types` (xoá schema riêng).

3. **apps/backend/ai/ai.service.ts**:
   - Đổi prompt sang system prompt structured-JSON giống Edge (`REASONING_SYSTEM_PROMPT`).
   - Stream JSON-mode hoặc stream raw text rồi extract JSON bằng regex `\{[\s\S]*\}` ở client (giống Edge hiện tại).
   - Hoặc thêm endpoint non-stream `POST /ai/explain` trả về JSON object luôn (đơn giản hơn cho showcase Wave 1).

4. **apps/backend/ai/ai.controller.ts**: Thêm endpoint non-stream `/ai/explain` (`@Post`) trả JSON. Giữ `/ai/explain/stream` (SSE) cho Wave 2.

5. **src/lib/aiExplainClient.ts**:
   - NestJS path: gọi `apiFetch<DeepExplainResult>('/ai/explain', { method: 'POST', body: JSON.stringify({ question, context, explain_type }) })` thay vì `streamSSE`.
   - Bỏ `JSON.parse(full)` fragile.

6. **packages/types/index.ts**: export thêm `DeepExplainResult` để FE và BE share type.

### Phương án B — Giữ NestJS streaming, đổi UI để render text dần
Thiết kế lại UI tab giải thích để show streaming text (markdown) thay vì structured object. Phù hợp ADR (SSE) nhưng tốn công sửa các component (`GrammarSensei`, `DeepExplanationSheet`, game feedback).

**Đề xuất Phương án A** cho Wave 1 (giữ shape ổn định), Wave 2 mới chuyển sang streaming khi UI sẵn sàng.

## Việc cần làm cụ thể (Phương án A)
1. Update `packages/types/src/schemas/index.ts` — `ExplainSchema` + thêm `DeepExplainResultSchema`.
2. Update `apps/backend/src/modules/ai/dto/explain.dto.ts` — dùng schema mới.
3. Refactor `ai.service.ts` — copy `REASONING_SYSTEM_PROMPT` + `buildUserPrompt` từ Edge, parse JSON từ AI Gateway response (non-stream cho v1).
4. Refactor `ai.controller.ts` — `@Post('explain')` non-stream JSON, giữ `/ai/explain/stream` cho sau.
5. Update `src/lib/aiExplainClient.ts` — đổi nhánh NestJS sang `apiFetch` JSON.
6. Cập nhật `.env.example` (FE) ghi rõ `VITE_BACKEND_URL` bắt buộc khi bật cờ.
7. Cập nhật `apps/backend/.env.example` — yêu cầu `LOVABLE_API_KEY`, `SUPABASE_JWKS_URL`, `CORS_ORIGINS`.
8. Cập nhật `docs/MIGRATION_PLAN.md` — đánh dấu Wave 1 done sau khi flow thông.

## Cách verify sau khi fix
- Chạy backend local (`cd apps/backend && npm run start:dev`).
- Set `VITE_BACKEND_URL=http://localhost:3001` + `VITE_USE_NESTJS_AI_EXPLAIN=true` trong `.env`.
- Mở 1 game (vd MultipleChoiceGame) → bấm "Giải thích AI" → verify response shape giống khi tắt cờ.
- Tắt cờ → verify Edge path vẫn hoạt động (regression).
- Check Swagger `http://localhost:3001/docs` — `POST /ai/explain` có đúng schema mới.

## Lưu ý
- Không động vào 3 chỗ `MinnaVocabulary` (image/text analyzer) và `ImportVocabularyDialog` — payload `image_vocab/text_vocab` riêng, không thuộc luồng giải thích.
- `streamExplain()` trong `groqServices.ts` (streaming token UI) tạm thời vẫn gọi thẳng Edge — sẽ migrate ở Wave 2 cùng SSE.