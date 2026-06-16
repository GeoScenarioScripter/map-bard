import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  completeWithRepair,
  extractJson,
  LlmValidationError,
  type ChatMessage,
} from './adapter.js';

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips a ```json fenced block', () => {
    const raw = 'Here you go:\n```json\n{"a":2}\n```\nthanks';
    expect(extractJson(raw)).toEqual({ a: 2 });
  });

  it('falls back to first { … last } when there is surrounding prose', () => {
    expect(extractJson('sure: {"a":3} done')).toEqual({ a: 3 });
  });

  it('throws on non-JSON', () => {
    expect(() => extractJson('not json at all')).toThrow();
  });
});

const schema = z.object({ name: z.string(), count: z.number() });
const req = { system: 'sys', prompt: 'do it', schema };

describe('completeWithRepair', () => {
  it('returns validated data on a first good response', async () => {
    const generate = vi.fn(async () => '{"name":"ok","count":2}');
    const out = await completeWithRepair(req, generate);
    expect(out).toEqual({ name: 'ok', count: 2 });
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it('repairs invalid JSON, then succeeds, feeding the error back', async () => {
    const generate = vi
      .fn<(m: ChatMessage[]) => Promise<string>>()
      .mockResolvedValueOnce('totally not json')
      .mockResolvedValueOnce('{"name":"ok","count":5}');

    const out = await completeWithRepair(req, generate, { maxAttempts: 3 });
    expect(out).toEqual({ name: 'ok', count: 5 });
    expect(generate).toHaveBeenCalledTimes(2);

    // The retry turn must carry the assistant's bad output + a repair instruction.
    const secondCallMessages = generate.mock.calls[1]![0];
    expect(secondCallMessages.at(-2)).toEqual({ role: 'assistant', content: 'totally not json' });
    expect(secondCallMessages.at(-1)?.role).toBe('user');
    expect(secondCallMessages.at(-1)?.content).toMatch(/not accepted/i);
  });

  it('repairs schema-invalid output (wrong type) and reports the field', async () => {
    const generate = vi
      .fn<(m: ChatMessage[]) => Promise<string>>()
      .mockResolvedValueOnce('{"name":"ok","count":"two"}')
      .mockResolvedValueOnce('{"name":"ok","count":2}');

    const out = await completeWithRepair(req, generate);
    expect(out).toEqual({ name: 'ok', count: 2 });
    const repairTurn = generate.mock.calls[1]![0].at(-1)?.content ?? '';
    expect(repairTurn).toMatch(/count/);
  });

  it('throws LlmValidationError after exhausting attempts', async () => {
    const generate = vi.fn(async () => '{"name":"ok"}'); // missing count, always
    await expect(completeWithRepair(req, generate, { maxAttempts: 2 })).rejects.toBeInstanceOf(
      LlmValidationError,
    );
    expect(generate).toHaveBeenCalledTimes(2);
  });
});
