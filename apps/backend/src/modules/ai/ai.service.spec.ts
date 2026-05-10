import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

type FetchMock = jest.Mock<Promise<Response>, [string | URL, RequestInit?]>;

describe('AiService', () => {
  let service: AiService;
  let originalFetch: typeof fetch;

  beforeEach(() => {
    const config = {
      get: (k: string) => (k === 'ai.lovableApiKey' ? 'test-key' : undefined),
    } as unknown as ConfigService;
    service = new AiService(config);
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('explain() returns a parsed DeepExplainResult', async () => {
    const payload = {
      reasoning_steps: [
        { step: 1, title: 'A', explanation: 'B', example: 'C' },
      ],
      conclusion: 'OK',
      difficulty: 'N5',
      related_patterns: ['です', 'ます'],
    };

    const mock: FetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify(payload) } }],
      }),
      text: async () => '',
    } as unknown as Response);
    global.fetch = mock as unknown as typeof fetch;

    const out = await service.explain({
      question: 'Vì sao dùng は?',
      explain_type: 'grammar',
    });
    expect(out.conclusion).toBe('OK');
    expect(out.difficulty).toBe('N5');
    expect(out.model_used).toBe('google/gemini-2.5-flash');
    expect(mock).toHaveBeenCalledWith(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('explain() throws on invalid schema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: '{"foo":"bar"}' } }],
      }),
      text: async () => '',
    } as unknown as Response) as unknown as typeof fetch;

    await expect(
      service.explain({ question: 'q', explain_type: 'grammar' }),
    ).rejects.toThrow(/invalid schema/);
  });

  it('explain() surfaces 429 as rate-limit error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'too many',
    } as unknown as Response) as unknown as typeof fetch;

    await expect(
      service.explain({ question: 'q', explain_type: 'grammar' }),
    ).rejects.toThrow(/Rate limit/);
  });
});
