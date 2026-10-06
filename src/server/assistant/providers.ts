import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { env } from "@/env";
import {
  getChatConfigAsync,
  type ChatConfig,
} from "@/server/config/chat-config";

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

/** What a model call is for. Each purpose may run on its own model. */
export type LlmPurpose = "assistant" | "moderation";

/**
 * The single place that decides the model id. The assistant uses
 * `llmModel` (LLM_MODEL env > config.json > default). Moderation uses the
 * remote-only `moderationModel` override, else the assistant's model.
 */
export function resolveModelId(
  purpose: LlmPurpose,
  cfg: Pick<ChatConfig, "llmModel" | "moderationModel">,
): string {
  return purpose === "moderation"
    ? (cfg.moderationModel ?? cfg.llmModel)
    : cfg.llmModel;
}

// Reasoning (low): deferred pending live verification that providerOptions
// `thinkingLevel`/`reasoning_effort` round-trips through
// `@ai-sdk/openai-compatible@^3.0.41` on the live endpoint. Do NOT add
// providerOptions reasoning here until that probe passes.
/** Single OpenAI-compatible provider; the model id is chosen by purpose. */
export async function getModel(purpose: LlmPurpose) {
  const { apiKey, baseURL } = resolveLlmEnv(env);
  const modelId = resolveModelId(purpose, await getChatConfigAsync());
  return createOpenAICompatible({
    name: "llm",
    apiKey,
    baseURL,
    includeUsage: true,
  })(modelId);
}
