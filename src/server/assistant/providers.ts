import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";

export const DEFAULT_LLM_BASE_URL = "https://openrouter.ai/api/v1";
export const DEFAULT_LLM_MODEL = "@preset/afterclass";

export type LlmEnvLike = {
  OPENROUTER_API_KEY?: string;
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
};

export function resolveLlmEnv(e: LlmEnvLike): {
  apiKey: string;
  baseURL: string;
  model: string;
} {
  // OpenRouter transport: the dedicated OPENROUTER_API_KEY wins, LLM_API_KEY
  // stays as the fallback. baseURL/model fallbacks are unchanged —
  // LLM_BASE_URL/LLM_MODEL envs still override (Vercel sets all three per
  // environment). Fail-closed (Task 8): a missing/empty key used to
  // silently become "" and surface as a cryptic 401 on the first turn. Throw
  // here instead so the misconfiguration is loud at the call site.
  const apiKey = e.OPENROUTER_API_KEY ?? e.LLM_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error(
      "resolveLlmEnv: missing OPENROUTER_API_KEY (or LLM_API_KEY fallback) — set it in the environment (see .env.example)",
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
// `@ai-sdk/openai-compatible@^3.0.41` on the live endpoint (per plan
// §9 impl-verification #1). Do NOT add providerOptions reasoning here
// until that probe passes — no behavior change in this file.
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
