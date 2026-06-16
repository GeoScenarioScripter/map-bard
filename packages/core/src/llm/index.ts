/** The LLM seam: the adapter contract + the single DashScope provider. */
export {
  completeWithRepair,
  extractJson,
  LlmValidationError,
  type ChatMessage,
  type CompleteRequest,
  type Generate,
  type LlmAdapter,
  type RepairOptions,
} from './adapter.js';
export {
  createDashScopeAdapter,
  createDashScopeAdapterFromEnv,
  dashScopeConfigFromEnv,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  type DashScopeConfig,
} from './dashscope.js';
