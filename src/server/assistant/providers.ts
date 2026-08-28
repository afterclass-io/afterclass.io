import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";

export const DEFAULT_LLM_BASE_URL = "https://api.deepseek.com";
export const DEFAULT_LLM_MODEL = "deepseek-v4-flash";

export type LlmEnvLike = {
  LLM_API_KEY?: string;
  LLM_BASE_URL?: string;
  LLM_MODEL?: string;
};

export function resolveLlmEnv(e: LlmEnvLike): { apiKey: string; baseURL: string; model: string } {
  return {
    apiKey: e.LLM_API_KEY ?? "",
    baseURL: e.LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL,
    model: e.LLM_MODEL ?? DEFAULT_LLM_MODEL,
  };
}

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
