import type { UIMessage } from "ai";

export const MAX_SESSION_MESSAGES = 200;
export const MAX_SESSIONS = 50;

export function stripToolParts(messages: UIMessage[]): UIMessage[] {
  // Remove tool parts entirely: hollow shells (input/output undefined) replay
  // as malformed tool-call/tool-result pairs on restore and can 400 at the
  // provider. A clean text transcript is valid, deterministic, and cheaper to
  // re-send on the restore turn's cold cache.
  return messages.map((m) => ({
    ...m,
    parts: m.parts.filter((p) => p.type !== "dynamic-tool" && !p.type.startsWith("tool-")),
  }));
}

export function capMessages(messages: UIMessage[]): UIMessage[] {
  return stripToolParts(messages).slice(-MAX_SESSION_MESSAGES);
}

export function titleFromMessages(messages: UIMessage[]): string | null {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = m.parts
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
