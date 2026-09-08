import { convertToModelMessages, pruneMessages } from "ai";
import type { ModelMessage, UIMessage } from "ai";

export const TOKEN_ESTIMATE_CHARS_PER_TOKEN = 4;
// NOTE: heuristic (JSON chars / 4). ~right for English; JSON-heavy tool payloads skew it.
// Verifying against the provider's real tokenizer is a tracked follow-up — do NOT add a
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
  // Incremental totals (Task 10): costs are computed ONCE and kept in lockstep
  // with the slice, so the loop is O(n) — the old total(trimmed) re-scan on
  // every iteration was O(n²) on long histories.
  let costs = messages.map(estimateTokens);
  let total = costs.reduce((a, b) => a + b, 0);
  let trimmed = messages;
  if (total <= maxTokens) return trimmed;

  // Cache-friendly: keep a stable head (prefix) and the recent tail; drop a contiguous
  // MIDDLE block (oldest-first, starting right after the head). Keeps the head as a stable
  // cacheable prefix and preserves the most recent context.
  while (trimmed.length > head + tail && total > maxTokens) {
    total -= costs[head] ?? 0; // drop oldest middle first
    trimmed = [...trimmed.slice(0, head), ...trimmed.slice(head + 1)];
    costs = [...costs.slice(0, head), ...costs.slice(head + 1)];
  }

  // Extreme fallback: still over budget → drop the head anchor too, but NEVER the last message.
  while (trimmed.length > 1 && total > maxTokens) {
    total -= costs[0] ?? 0;
    trimmed = trimmed.slice(1);
    costs = costs.slice(1);
  }

  return trimmed;
}

// CACHE ECONOMICS (2026-09-01 audit) - do NOT widen this window:
// W=2 bills each turn's tool results at miss exactly once (next turn), then
// drops them. W>=3 is strictly worse: the with-tools -> without-tools
// transition of the message leaving the window lands BEFORE newer tool
// results in the byte stream, re-billing those newer results at miss on
// every remaining turn. "Keep everything" only wins when a result survives
// >10 subsequent turns and grows context without bound.

export const PAGE_CONTEXT_BLOCK_RE = /<page_context>[\s\S]*?<\/page_context>/g;

const hasPageContextBlock = (text: string): boolean => {
  // Fresh non-global scan each call: module-global /g regexes carry lastIndex
  // state across .test() calls and are a classic source of flaky alternation.
  PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
  const found = PAGE_CONTEXT_BLOCK_RE.test(text);
  PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
  return found;
};

const removePageContextBlocks = (text: string): string => {
  PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
  return text.replace(PAGE_CONTEXT_BLOCK_RE, "");
};

/**
 * Drop superseded <page_context> blocks from older user turns, keeping only
 * the latest user message that carries one. Per-send snapshots keep new turns
 * fresh, but old blocks linger and burn tokens / confuse the "latest applies"
 * rule — enforcement, not just prompting. Pure + unit-tested.
 */
export function stripStalePageContext(messages: UIMessage[]): UIMessage[] {
  let latestIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    const parts = Array.isArray(m.parts) ? m.parts : [];
    const hasBlock = parts.some(
      (p) => p.type === "text" && "text" in p && hasPageContextBlock(p.text),
    );
    if (hasBlock) {
      latestIdx = i;
      break;
    }
  }
  if (latestIdx === -1) return messages;
  return messages.map((m, i) => {
    if (i === latestIdx || m?.role !== "user") return m;
    const parts = Array.isArray(m.parts) ? m.parts : [];
    let changed = false;
    const stripped = parts.map((p) => {
      if (p.type !== "text" || !("text" in p)) return p;
      if (!hasPageContextBlock(p.text)) return p;
      changed = true;
      return { ...p, text: removePageContextBlocks(p.text) };
    });
    return changed ? { ...m, parts: stripped } : m;
  });
}

/** Convert UI messages, prune reasoning/tool-call bloat, then enforce the token budget.
 * Task 8: maxInputTokens comes from the canonical chat-config. */
export async function trimToBudget(
  messages: UIMessage[],
): Promise<ModelMessage[]> {
  const chat = await import("@/server/config/chat-config").then((m) =>
    m.getChatConfigAsync(),
  );
  const modelMessages = await convertToModelMessages(
    stripStalePageContext(messages),
  );
  const pruned = pruneMessages({
    messages: modelMessages,
    reasoning: "all",
    toolCalls: "before-last-2-messages",
    emptyMessages: "remove",
  });
  return applyTokenBudget(pruned, chat.maxInputTokens);
}
