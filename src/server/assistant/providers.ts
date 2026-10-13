import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";
import { getChatConfigAsync } from "@/server/config/chat-config";

export const DEFAULT_LLM_BASE_URL = "https://openrouter.ai/api/v1";

export type LlmEnvLike = {
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
};

export function resolveLlmEnv(e: LlmEnvLike): {
  apiKey: string;
  baseURL: string;
} {
  // Generic OpenAI-compatible key: the operator pairs LLM_API_KEY with
  // LLM_BASE_URL (e.g. an OpenRouter preset key with the preset base URL).
  // Fail-closed: a missing/empty key used to silently become "" and surface
  // as a cryptic 401 on the first turn. Throw here instead so the
  // misconfiguration is loud at the call site.
  const apiKey = e.LLM_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error(
      "resolveLlmEnv: missing LLM_API_KEY — set it in the environment (see .env.example)",
    );
  }
  return {
    apiKey,
    baseURL: e.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL,
  };
}

// Reasoning (low): deferred pending live verification that providerOptions
// `thinkingLevel`/`reasoning_effort` round-trips through
// `@ai-sdk/openai-compatible@^3.0.41` on the live endpoint. Do NOT add
// providerOptions reasoning here until that probe passes.
/**
 * Single OpenAI-compatible provider. The chat assistant and the moderation
 * judge both call this, so one `llmModel` (LLM_MODEL env > config.json >
 * default) and one `LLM_BASE_URL` serve both. No second knob exists.
 */
export async function getModel() {
  const { apiKey, baseURL } = resolveLlmEnv(env);
  const { llmModel: modelId } = await getChatConfigAsync();
  return createOpenAICompatible({
    name: "llm",
    apiKey,
    baseURL,
    includeUsage: true,
  })(modelId);
}
