/**
 * The LLM adapter contract (build-guide §5).
 *
 * One interface — `complete({ system, prompt, schema }) → validated object` —
 * sits in front of the single provider. Every pipeline stage that needs the
 * model goes through it, so the stages never see provider details and can be
 * tested against a stub. Structured output is always validated against the
 * caller's Zod schema; invalid output is repaired/retried, never passed through
 * (directive 4).
 */
import { z } from 'zod';

/** A request for one structured completion, validated against `schema`. */
export interface CompleteRequest<T> {
  /** System framing — role and hard rules. */
  system: string;
  /** The user turn — task + serialized inputs. */
  prompt: string;
  /** The model's JSON output is parsed against this; failures drive repair. */
  schema: z.ZodType<T>;
}

/** The single seam the pipeline depends on. Implemented per provider. */
export interface LlmAdapter {
  complete<T>(req: CompleteRequest<T>): Promise<T>;
}

/** A chat turn passed to the underlying provider. */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** A provider call: turns a message list into raw model text. */
export type Generate = (messages: ChatMessage[]) => Promise<string>;

export interface RepairOptions {
  /** Total attempts including the first (default 3). */
  maxAttempts?: number;
}

/** Thrown when the model never produces schema-valid output within the budget. */
export class LlmValidationError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    readonly lastError: string,
  ) {
    super(message);
    this.name = 'LlmValidationError';
  }
}

/**
 * Pull a JSON object out of raw model text: prefer a fenced ```json block, else
 * fall back to the first `{` … last `}`. Throws if the result isn't valid JSON.
 */
export function extractJson(raw: string): unknown {
  const text = raw.trim();
  let candidate = text;
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    candidate = fence[1].trim();
  } else {
    const first = candidate.indexOf('{');
    const last = candidate.lastIndexOf('}');
    if (first !== -1 && last > first) candidate = candidate.slice(first, last + 1);
  }
  return JSON.parse(candidate) as unknown;
}

function formatZodIssues(error: z.ZodError): string {
  return error.issues.map((i) => `- ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
}

function repairPrompt(errors: string): string {
  return (
    `Your previous response was not accepted. Problems:\n${errors}\n\n` +
    `Return a corrected JSON object only — no prose, no code fences.`
  );
}

/**
 * Provider-agnostic completion with repair/retry. Calls `generate`, parses +
 * validates the result against `req.schema`; on any failure it appends the
 * offending output and the specific errors as a follow-up turn and retries, up
 * to `maxAttempts`. Throws {@link LlmValidationError} if it never validates.
 *
 * Kept separate from any provider so the retry behaviour is unit-testable with
 * a fake `generate` and no network.
 */
export async function completeWithRepair<T>(
  req: CompleteRequest<T>,
  generate: Generate,
  options: RepairOptions = {},
): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const messages: ChatMessage[] = [
    { role: 'system', content: req.system },
    { role: 'user', content: req.prompt },
  ];
  let lastError = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await generate(messages);

    let parsed: unknown;
    try {
      parsed = extractJson(raw);
    } catch (e) {
      lastError = `Output was not valid JSON: ${(e as Error).message}`;
      messages.push({ role: 'assistant', content: raw });
      messages.push({ role: 'user', content: repairPrompt(lastError) });
      continue;
    }

    const result = req.schema.safeParse(parsed);
    if (result.success) return result.data;

    lastError = formatZodIssues(result.error);
    messages.push({ role: 'assistant', content: raw });
    messages.push({ role: 'user', content: repairPrompt(lastError) });
  }

  throw new LlmValidationError(
    `LLM output failed schema validation after ${maxAttempts} attempt(s).\nLast error:\n${lastError}`,
    maxAttempts,
    lastError,
  );
}
