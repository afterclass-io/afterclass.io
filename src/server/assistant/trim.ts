import { convertToModelMessages, pruneMessages } from "ai";
import type { ModelMessage, UIMessage } from "ai";

export const TOKEN_ESTIMATE_CHARS_PER_TOKEN = 4;
// NOTE: heuristic (JSON chars / 4). ~right for English; JSON-heavy tool payloads skew it.
// Verifying against DeepSeek's real tokenizer is a tracked follow-up — do NOT add a
// tokenizer dependency in this change.

const estimateTokens = (m: ModelMessage): number =>
  Math.ceil(JSON.stringify(m).length / TOKEN_ESTIMATE_CHARS_PER_TOKEN);

export interface TokenBudgetOptions {
  /** Stable head anchor that is NEVER trimmed (keeps a cacheable prefix). Default 1. */
  maxHeadMessages?: number;
  /** Recent tail anchor that is NEVER trimmed (keeps current intent). Default 1. */
  minTailMessages?: number;
}

export function applyTokenBudget(
  messages: ModelMessage[],
  maxTokens: number,
  options?: TokenBudgetOptions,
): ModelMessage[] {
  const head = Math.max(1, options?.maxHeadMessages ?? 1);
  const tail = Math.max(1, options?.minTailMessages ?? 1);
  const total = (ms: ModelMessage[]) => ms.reduce((sum, m) => sum + estimateTokens(m), 0);

  let trimmed = messages;
  if (total(trimmed) <= maxTokens) return trimmed;

  // Cache-friendly: keep a stable head (prefix) and the recent tail; drop a contiguous
  // MIDDLE block (oldest-first, starting right after the head). Keeps the head as a stable
  // cacheable prefix and preserves the most recent context.
  while (trimmed.length > head + tail && total(trimmed) > maxTokens) {
    trimmed = [...trimmed.slice(0, head), ...trimmed.slice(head + 1)];
  }

  // Extreme fallback: still over budget → drop the head anchor too, but NEVER the last message.
  while (trimmed.length > 1 && total(trimmed) > maxTokens) {
    trimmed = trimmed.slice(1);
  }

  return trimmed;
}

/** Convert UI messages, prune reasoning/tool-call bloat, then enforce the token budget. */
export async function trimToBudget(messages: UIMessage[]): Promise<ModelMessage[]> {
  const chat = await import("@/server/ecfg/chat").then((m) => m.getChatConfig());
  const modelMessages = await convertToModelMessages(messages);
  const pruned = pruneMessages({
    messages: modelMessages,
    reasoning: "all",
    toolCalls: "before-last-2-messages",
    emptyMessages: "remove",
  });
  return applyTokenBudget(pruned, chat.maxInputTokens);
}
