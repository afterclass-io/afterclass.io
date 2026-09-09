import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";

export const DEFAULT_LLM_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_LLM_MODEL = "@preset/afterclass";

export type LlmEnvLike = {
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
};

export function resolveLlmEnv(e: LlmEnvLike): {
  apiKey: string;
  baseURL: string;
  model: string;
} {
  // Generic OpenAI-compatible key: the operator pairs LLM_API_KEY with
  // LLM_BASE_URL/LLM_MODEL (e.g. an OpenRouter preset key with the preset
  // base URL + model id). Fail-closed: a missing/empty key used to
  // silently become "" and surface as a cryptic 401 on the first turn. Throw
  // here instead so the misconfiguration is loud at the call site.
  const apiKey = e.LLM_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error(
      "resolveLlmEnv: missing LLM_API_KEY — set it in the environment (see .env.example)",
    );
  }
  return {
    apiKey,
    baseURL: e.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL,
    model: e.LLM_MODEL ?? DEFAULT_LLM_MODEL,
  };
}

// Reasoning (low): deferred pending live verification that providerOptions
// `thinkingLevel`/`reasoning_effort` round-trips through
// `@ai-sdk/openai-compatible@^3.0.41` on the live endpoint. Do NOT add
// providerOptions reasoning here until that probe passes — no behavior
// change in this file.
/** Single OpenAI-compatible provider configured from LLM_* env vars. */
export async function getModel() {
  const { apiKey, baseURL, model } = resolveLlmEnv(env);
  return createOpenAICompatible({
    name: "llm",
    apiKey,
    baseURL,
    includeUsage: true,
  })(model);
}
