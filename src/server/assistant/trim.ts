import { convertToModelMessages, pruneMessages } from "ai";
import type { ModelMessage, UIMessage } from "ai";

const estimateTokens = (m: ModelMessage): number => Math.ceil(JSON.stringify(m).length / 4);

/** Drop the oldest messages until the estimate fits maxTokens. Pure + testable. */
export function applyTokenBudget(messages: ModelMessage[], maxTokens: number): ModelMessage[] {
  let trimmed = messages;
  while (trimmed.length > 1) {
    const total = trimmed.reduce((sum, m) => sum + estimateTokens(m), 0);
    if (total <= maxTokens) break;
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
