import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeepExplainResult,
  DeepExplainResultSchema,
  ExplainDto,
} from './dto/explain.dto';

const REASONING_SYSTEM_PROMPT = `Bạn là **Sensei Suy Luận** — chuyên gia giải thích ngữ pháp / từ vựng / kanji tiếng Nhật cho người Việt bằng cách suy nghĩ từng bước (step-by-step).

PHONG CÁCH:
- Bắt đầu bằng "Hãy để tôi phân tích từng bước..."
- Trình bày rõ từng bước, đánh số thứ tự
- Giọng điệu thân thiện, kiên nhẫn như thầy 1-1
- Kết thúc bằng tóm tắt 1-2 câu tiếng Việt

TRẢ LỜI BẰNG ĐÚNG JSON OBJECT (không markdown, không text ngoài JSON):
{
  "reasoning_steps": [
    { "step": 1, "title": "...", "explanation": "...", "example": "..." }
  ],
  "conclusion": "Tóm tắt tiếng Việt",
  "difficulty": "N5 | N4 | N3 | N2 | N1",
  "related_patterns": ["..."],
  "mnemonics": "Mẹo ghi nhớ ngắn cho người Việt",
  "common_mistakes": "Lỗi sai phổ biến nhất"
}`;

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

function buildUserPrompt(dto: ExplainDto): string {
  return [
    `Loại giải thích: ${dto.explain_type ?? 'grammar'}`,
    `Câu hỏi / Điểm cần phân tích:\n"""${dto.question}"""`,
    dto.context ? `Ngữ cảnh thêm:\n"""${dto.context}"""` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function extractFirstJson(raw: string): string | null {
  const trimmed = raw.trim();
  try {
    JSON.parse(trimmed);
    return trimmed;
  } catch {
    /* fallthrough */
  }
  const md = trimmed.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (md?.[1]) return md[1];
  const m = trimmed.match(/\{[\s\S]*\}/);
  return m ? m[0] : null;
}

export interface StreamEvent {
  type: 'token' | 'result' | 'error' | 'done';
  content?: string;
  data?: DeepExplainResult;
  message?: string;
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  private apiKey(): string {
    const key = this.config.get<string>('ai.lovableApiKey');
    if (!key) throw new InternalServerErrorException('LOVABLE_API_KEY not configured');
    return key;
  }

  /**
   * Non-streaming structured explain — returns DeepExplainResult JSON.
   * Mirrors the Edge Function `ai-explain` contract for drop-in replacement.
   */
  async explain(dto: ExplainDto): Promise<DeepExplainResult> {
    const apiKey = this.apiKey();
    const model = DEFAULT_MODEL;

    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REASONING_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(dto) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (res.status === 429) throw new InternalServerErrorException('Rate limit exceeded');
      if (res.status === 402) throw new InternalServerErrorException('AI credits exhausted');
      throw new InternalServerErrorException(
        `AI gateway error ${res.status}: ${txt.slice(0, 200)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const jsonStr = extractFirstJson(raw);
    if (!jsonStr) throw new InternalServerErrorException('AI response did not contain valid JSON');

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      throw new InternalServerErrorException(`JSON parse failed: ${(err as Error).message}`);
    }

    const result = DeepExplainResultSchema.safeParse({
      ...(parsed as object),
      model_used: model,
    });
    if (!result.success) {
      throw new InternalServerErrorException(`AI returned invalid schema: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Streaming variant — returns a ReadableStream of SSE events:
   *   data: {"type":"token","content":"..."}
   *   data: {"type":"result","data":{...}}
   *   data: {"type":"done"}
   *   data: [DONE]
   * Mirrors the Edge Function `ai-explain` streaming protocol so the UI
   * (`streamSSEEvents`) can render token-by-token.
   */
  async explainStream(dto: ExplainDto): Promise<NodeJS.ReadableStream> {
    const apiKey = this.apiKey();
    const model = DEFAULT_MODEL;

    const upstream = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REASONING_SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(dto) },
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => '');
      throw new InternalServerErrorException(
        `AI gateway stream error ${upstream.status}: ${txt.slice(0, 200)}`,
      );
    }

    const { Readable } = await import('node:stream');
    const reader = (upstream.body as unknown as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();

    let fullText = '';
    let buffer = '';

    const send = (evt: StreamEvent) => `data: ${JSON.stringify(evt)}\n\n`;

    const stream = new Readable({ read() {} });

    (async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;
            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const delta = parsed.choices?.[0]?.delta?.content ?? '';
              if (delta) {
                fullText += delta;
                stream.push(send({ type: 'token', content: delta }));
              }
            } catch {
              /* skip malformed */
            }
          }
        }

        // Final structured result
        const jsonStr = extractFirstJson(fullText);
        if (jsonStr) {
          try {
            const parsed = JSON.parse(jsonStr) as object;
            const result = DeepExplainResultSchema.safeParse({
              ...parsed,
              model_used: model,
            });
            if (result.success) {
              stream.push(send({ type: 'result', data: result.data }));
            }
          } catch {
            /* swallow */
          }
        }
        stream.push(send({ type: 'done' }));
        stream.push('data: [DONE]\n\n');
      } catch (err) {
        stream.push(send({ type: 'error', message: (err as Error).message }));
      } finally {
        stream.push(null);
      }
    })();

    return stream;
  }
}
