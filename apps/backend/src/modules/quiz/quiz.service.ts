import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GrammarQuizDto,
  QuizResult,
  QuizResultSchema,
} from './dto/grammar-quiz.dto';

const QUIZ_SYSTEM_PROMPT = `Bạn là chuyên gia soạn thảo đề thi năng lực tiếng Nhật (JLPT).
Tạo 3 câu hỏi trắc nghiệm dựa trên cấu trúc ngữ pháp được cung cấp.

Mỗi câu hỏi gồm:
1. Câu hỏi tiếng Nhật (có chỗ trống bằng dấu ____)
2. 4 lựa chọn (A, B, C, D) bằng tiếng Nhật
3. Đáp án đúng (index 0-3)
4. Giải thích bằng tiếng Việt
5. Furigana cho chữ Hán khó

Trả về DUY NHẤT JSON object, không markdown:
{
  "questions": [
    { "question": "...", "options": ["a","b","c","d"], "correct_answer": 0, "explanation": "...", "furigana": "..." }
  ]
}`;

const ASSESSMENT_SYSTEM_PROMPT = `Bạn là chuyên gia đánh giá năng lực tiếng Nhật theo chuẩn JLPT.
Tạo 5 câu hỏi trắc nghiệm để kiểm tra trình độ ở một cấp độ JLPT cụ thể.

Yêu cầu:
- Câu hỏi kiểm tra ngữ pháp đặc trưng cho cấp độ
- Có chỗ trống ____ trong câu tiếng Nhật
- 4 lựa chọn, chỉ 1 đáp án đúng
- Lựa chọn sai phải hợp lý nhưng sai ngữ pháp
- Giải thích bằng tiếng Việt
- Có furigana cho chữ Hán khó

Trả về DUY NHẤT JSON:
{
  "level_tested": "N5|N4|N3|N2|N1",
  "questions": [
    { "question":"...", "options":["a","b","c","d"], "correct_answer":0, "explanation":"...", "furigana":"..." }
  ]
}`;

const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1h

interface CacheEntry {
  data: QuizResult;
  exp: number;
}

@Injectable()
export class QuizService {
  private cache = new Map<string, CacheEntry>();

  constructor(private readonly config: ConfigService) {}

  async generateGrammarQuiz(dto: GrammarQuizDto): Promise<QuizResult> {
    const key = this.cacheKey(dto);
    const hit = this.cache.get(key);
    if (hit && hit.exp > Date.now()) return hit.data;

    const apiKey = this.config.get<string>('ai.lovableApiKey');
    if (!apiKey) throw new InternalServerErrorException('LOVABLE_API_KEY not configured');

    const isAssessment = dto.mode === 'assessment';
    const systemPrompt = isAssessment ? ASSESSMENT_SYSTEM_PROMPT : QUIZ_SYSTEM_PROMPT;
    const userPrompt = isAssessment
      ? `Hãy tạo 5 câu hỏi kiểm tra trình độ JLPT ${dto.currentLevel ?? 'N5'}.`
      : `Tạo 3 câu hỏi về cấu trúc: ${dto.grammar_point ?? 'N5 basic'}. Trình độ: ${dto.level ?? 'N5'}. ${dto.explanation ?? ''}`;

    const res = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
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
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new InternalServerErrorException('AI returned no JSON');
      parsed = JSON.parse(m[0]);
    }

    const result = QuizResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new InternalServerErrorException(
        `Quiz schema invalid: ${result.error.message.slice(0, 300)}`,
      );
    }
    this.cache.set(key, { data: result.data, exp: Date.now() + CACHE_TTL_MS });
    return result.data;
  }

  private cacheKey(dto: GrammarQuizDto): string {
    return [dto.mode ?? 'quiz', dto.level ?? '', dto.currentLevel ?? '', dto.grammar_point ?? '']
      .join('|')
      .toLowerCase();
  }
}
