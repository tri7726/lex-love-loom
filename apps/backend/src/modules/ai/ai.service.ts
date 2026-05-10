import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExplainDto } from './dto/explain.dto';

const SYSTEM_PROMPT = `Bạn là một AI sensei chuyên giải thích từ vựng/ngữ pháp tiếng Nhật cho người Việt.
Giải thích ngắn gọn, dễ hiểu, có ví dụ. Trả lời bằng ngôn ngữ user yêu cầu.`;

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Streams Server-Sent Events from Lovable AI Gateway (OpenAI-compatible).
   * Yields raw text chunks.
   */
  async *streamExplain(dto: ExplainDto): AsyncGenerator<string, void, void> {
    const apiKey = this.config.get<string>('ai.lovableApiKey');
    if (!apiKey) throw new InternalServerErrorException('LOVABLE_API_KEY not configured');

    const model = dto.model ?? 'google/gemini-2.5-flash';
    const userPrompt = dto.context
      ? `Văn cảnh: ${dto.context}\n\nGiải thích: ${dto.text}\nNgôn ngữ trả lời: ${dto.language}`
      : `Giải thích: ${dto.text}\nNgôn ngữ trả lời: ${dto.language}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!res.ok || !res.body) {
      const txt = await res.text().catch(() => '');
      throw new InternalServerErrorException(
        `AI gateway error ${res.status}: ${txt.slice(0, 200)}`,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === 'string' && delta.length) yield delta;
        } catch {
          /* ignore partial JSON */
        }
      }
    }
  }
}
