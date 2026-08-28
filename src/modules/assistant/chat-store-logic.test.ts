import { describe, expect, it } from "vitest";
import { capMessages, pruneSessions, stripToolParts, titleFromMessages } from "./chat-store-logic";
import type { UIMessage } from "ai";

const textMsg = (id: string, text: string): UIMessage => ({ id, role: "user", parts: [{ type: "text", text }] });
const toolMsg = (id: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [{ type: "dynamic-tool", toolName: "search-courses", toolCallId: "t1", state: "output-available", input: { q: "CS101" }, output: { rows: 1 } }],
});

describe("chat-store-logic", () => {
  it("strips tool input/output from persisted messages", () => {
    const [m] = stripToolParts([toolMsg("a1")]);
    const part = m!.parts[0] as { input?: unknown; output?: unknown };
    expect(part.input).toBeUndefined();
    expect(part.output).toBeUndefined();
  });

  it("caps at MAX_SESSION_MESSAGES keeping the newest", () => {
    const many = Array.from({ length: 250 }, (_, i) => textMsg(`m${i}`, `msg ${i}`));
    const capped = capMessages(many);
    expect(capped).toHaveLength(200);
    expect(capped[0]!.id).toBe("m50");
  });

  it("titles from the first user text part", () => {
    expect(titleFromMessages([textMsg("u", "   Ask about COR-IS1702   ")])).toBe("Ask about COR-IS1702");
    expect(titleFromMessages([toolMsg("a")])).toBeNull();
  });

  it("keeps the newest 50 sessions", () => {
    const sessions = Array.from({ length: 60 }, (_, i) => ({ id: `s${i}` }));
    expect(pruneSessions(sessions)).toHaveLength(50);
    expect(pruneSessions(sessions)[0]).toEqual({ id: "s10" });
  });
});
