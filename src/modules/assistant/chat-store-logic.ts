import type { UIMessage } from "ai";

export const MAX_SESSION_MESSAGES = 200;
export const MAX_SESSIONS = 50;

// Matches the ephemeral <page_context> suffix the chat route appends per
// turn. Persisted history must be a clean transcript: snapshots go stale on
// navigation, so blocks are stripped before IndexedDB persist (never mixed
// into the visible message text client-side — this is belt-and-braces).
export const PAGE_CONTEXT_BLOCK_RE = /<page_context>[\s\S]*?<\/page_context>/g;

function partsOf(m: UIMessage): UIMessage["parts"] {
  return Array.isArray(m.parts) ? m.parts : [];
}

const hasPageContextBlock = (text: string): boolean => {
  // Fresh scan each call: module-global /g regexes carry lastIndex state
  // across .test() calls and are a classic source of flaky alternation.
  PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
  const found = PAGE_CONTEXT_BLOCK_RE.test(text);
  PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
  return found;
};

export function stripPageContext(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => {
    const parts = partsOf(m);
    let changed = false;
    const stripped = parts.map((p) => {
      if (p.type !== "text" || !("text" in p)) return p;
      if (!hasPageContextBlock(p.text)) return p;
      changed = true;
      PAGE_CONTEXT_BLOCK_RE.lastIndex = 0;
      return { ...p, text: p.text.replace(PAGE_CONTEXT_BLOCK_RE, "") };
    });
    return changed ? { ...m, parts: stripped } : m;
  });
}

export function stripToolParts(messages: UIMessage[]): UIMessage[] {
  // Remove tool parts entirely: hollow shells (input/output undefined) replay
  // as malformed tool-call/tool-result pairs on restore and can 400 at the
  // provider. A clean text transcript is valid, deterministic, and cheaper to
  // re-send on the restore turn's cold cache.
  return messages.map((m) => ({
    ...m,
    parts: partsOf(m).filter(
      (p) => p.type !== "dynamic-tool" && !p.type.startsWith("tool-"),
    ),
  }));
}

export function capMessages(messages: UIMessage[]): UIMessage[] {
  return stripPageContext(stripToolParts(messages)).slice(
    -MAX_SESSION_MESSAGES,
  );
}

export function titleFromMessages(messages: UIMessage[]): string | null {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = partsOf(m)
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
    if (text) return text.slice(0, 40);
  }
  return null;
}

export function pruneSessions<T extends { id: string }>(sessions: T[]): T[] {
  return sessions.slice(-MAX_SESSIONS);
}
