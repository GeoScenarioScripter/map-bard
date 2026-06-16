/**
 * The single MapBard LLM provider: DashScope (Alibaba Qwen) through its
 * OpenAI-compatible endpoint, driven with the `openai` SDK (CLAUDE.md §d).
 *
 * Do **not** generalize to multiple providers yet (build-guide §9). The whole
 * provider surface is this file; the rest of `core` only knows {@link LlmAdapter}.
 */
import OpenAI from 'openai';
import {
  completeWithRepair,
  type ChatMessage,
  type CompleteRequest,
  type Generate,
  type LlmAdapter,
} from './adapter.js';

/** The OpenAI-compatible DashScope base URL. */
export const DEFAULT_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

/** The default Qwen model (swappable via `MAPBARD_LLM_MODEL`). */
export const DEFAULT_MODEL = 'qwen3.7-max-2026-05-17';

export interface DashScopeConfig {
  apiKey: string;
  /** Defaults to {@link DEFAULT_BASE_URL}. */
  baseURL: string;
  /** Defaults to {@link DEFAULT_MODEL}. */
  model: string;
  /** Total schema-validation attempts including the first (default 3). */
  maxRepairAttempts?: number;
  /** Sampling temperature (default 0.4 — planning wants some range, not chaos). */
  temperature?: number;
}

/**
 * Read config from the environment (CLAUDE.md §d): `MAPBARD_LLM_KEY` (required),
 * `MAPBARD_LLM_BASE_URL` (optional), `MAPBARD_LLM_MODEL` (optional). Throws a
 * clear error if the key is missing so the CLI can tell the user what to set.
 */
export function dashScopeConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DashScopeConfig {
  const apiKey = env.MAPBARD_LLM_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'MAPBARD_LLM_KEY is not set. Copy .env.example to .env and add your DashScope API key.',
    );
  }
  return {
    apiKey,
    baseURL: env.MAPBARD_LLM_BASE_URL?.trim() || DEFAULT_BASE_URL,
    model: env.MAPBARD_LLM_MODEL?.trim() || DEFAULT_MODEL,
  };
}

/**
 * Build an {@link LlmAdapter} backed by DashScope. Requests JSON mode and runs
 * the shared repair/retry loop, so every returned object is schema-valid.
 */
export function createDashScopeAdapter(config: DashScopeConfig): LlmAdapter {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

  const generate: Generate = async (messages: ChatMessage[]) => {
    const res = await client.chat.completions.create({
      model: config.model,
      messages,
      response_format: { type: 'json_object' },
      temperature: config.temperature ?? 0.4,
    });
    return res.choices[0]?.message?.content ?? '';
  };

  return {
    complete<T>(req: CompleteRequest<T>) {
      return completeWithRepair(req, generate, { maxAttempts: config.maxRepairAttempts ?? 3 });
    },
  };
}

/** Convenience: build the adapter straight from `process.env`. */
export function createDashScopeAdapterFromEnv(env?: NodeJS.ProcessEnv): LlmAdapter {
  return createDashScopeAdapter(dashScopeConfigFromEnv(env));
}
