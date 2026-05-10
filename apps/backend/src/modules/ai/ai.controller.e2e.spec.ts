/**
 * E2E test for SSE endpoint POST /ai/explain/stream.
 *
 * Boots a real Nest app (AiModule + in-memory ConfigModule), mocks the
 * upstream Lovable AI Gateway via `global.fetch`, and asserts the SSE event
 * sequence: `token` (>=1) -> `result` -> `done` -> `[DONE]`.
 * Also covers the upstream-error path (no result event, error event emitted).
 */
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AiModule } from './ai.module';

/** Build a fake upstream OpenAI-style SSE body from a list of token chunks. */
function buildUpstreamSSE(tokens: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const lines: string[] = [];
  for (const t of tokens) {
    lines.push(
      `data: ${JSON.stringify({ choices: [{ delta: { content: t } }] })}\n\n`,
    );
  }
  lines.push('data: [DONE]\n\n');
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const l of lines) controller.enqueue(encoder.encode(l));
      controller.close();
    },
  });
}

interface SseEvent {
  type: 'token' | 'result' | 'error' | 'done';
  content?: string;
  data?: unknown;
  message?: string;
}

/** Parse a raw SSE text dump into structured events. Also tracks `[DONE]`. */
function parseSse(raw: string): { events: SseEvent[]; sawDoneSentinel: boolean } {
  const events: SseEvent[] = [];
  let sawDoneSentinel = false;
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data: ')) continue;
    const payload = t.slice(6);
    if (payload === '[DONE]') {
      sawDoneSentinel = true;
      continue;
    }
    try {
      events.push(JSON.parse(payload) as SseEvent);
    } catch {
      /* ignore malformed */
    }
  }
  return { events, sawDoneSentinel };
}

describe('POST /ai/explain/stream (SSE) — e2e', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ ai: { lovableApiKey: 'test-key' } })],
        }),
        AiModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await app.close();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('streams token -> result -> done -> [DONE]', async () => {
    const finalJson = JSON.stringify({
      reasoning_steps: [
        { step: 1, title: 'A', explanation: 'B', example: 'C' },
      ],
      conclusion: 'OK',
      difficulty: 'N5',
      related_patterns: ['は', 'が'],
    });
    // Split JSON across multiple SSE chunks so we get >=2 token events.
    const half = Math.floor(finalJson.length / 2);
    const tokens = [finalJson.slice(0, half), finalJson.slice(half)];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: buildUpstreamSSE(tokens),
      text: async () => '',
    } as unknown as Response) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/ai/explain/stream')
      .send({ question: 'Vì sao dùng は?', explain_type: 'grammar' })
      .buffer(true)
      .parse((r, cb) => {
        let data = '';
        r.setEncoding('utf8');
        r.on('data', (c) => (data += c));
        r.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const { events, sawDoneSentinel } = parseSse(res.body as string);
    const tokenEvents = events.filter((e) => e.type === 'token');
    const resultEvents = events.filter((e) => e.type === 'result');
    const doneEvents = events.filter((e) => e.type === 'done');

    expect(tokenEvents.length).toBeGreaterThanOrEqual(2);
    expect(tokenEvents.map((e) => e.content).join('')).toBe(finalJson);
    expect(resultEvents).toHaveLength(1);
    expect(
      (resultEvents[0].data as { conclusion: string }).conclusion,
    ).toBe('OK');
    expect(
      (resultEvents[0].data as { model_used: string }).model_used,
    ).toBe('google/gemini-2.5-flash');
    expect(doneEvents).toHaveLength(1);
    expect(sawDoneSentinel).toBe(true);

    // Ordering: last non-sentinel event is `done`, and `result` precedes `done`.
    const order = events.map((e) => e.type);
    expect(order[order.length - 1]).toBe('done');
    expect(order.indexOf('result')).toBeLessThan(order.lastIndexOf('done'));
  });

  it('returns 500 when upstream gateway errors before streaming', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      body: null,
      text: async () => 'bad gateway',
    } as unknown as Response) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/ai/explain/stream')
      .send({ question: 'q', explain_type: 'grammar' });

    expect(res.status).toBe(500);
  });

  it('emits no result event when upstream produces non-JSON tokens', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: buildUpstreamSSE(['hello ', 'world']),
      text: async () => '',
    } as unknown as Response) as unknown as typeof fetch;

    const res = await request(app.getHttpServer())
      .post('/ai/explain/stream')
      .send({ question: 'q', explain_type: 'grammar' })
      .buffer(true)
      .parse((r, cb) => {
        let data = '';
        r.setEncoding('utf8');
        r.on('data', (c) => (data += c));
        r.on('end', () => cb(null, data));
      });

    expect(res.status).toBe(200);
    const { events, sawDoneSentinel } = parseSse(res.body as string);
    expect(events.filter((e) => e.type === 'token').length).toBe(2);
    expect(events.filter((e) => e.type === 'result')).toHaveLength(0);
    expect(events.filter((e) => e.type === 'done')).toHaveLength(1);
    expect(sawDoneSentinel).toBe(true);
  });

  it('rejects invalid body via Zod validation pipe', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai/explain/stream')
      .send({ context: 'missing question' });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
