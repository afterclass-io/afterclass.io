import type { UIMessage } from "ai";

export const MAX_SESSION_MESSAGES = 200;
export const MAX_SESSIONS = 50;

export function stripToolParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((m) => ({
    ...m,
    parts: m.parts.map((p) => {
      if (p.type === "dynamic-tool" || p.type.startsWith("tool-")) {
        return { ...p, input: undefined, output: undefined };
      }
      return p;
    }),
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
