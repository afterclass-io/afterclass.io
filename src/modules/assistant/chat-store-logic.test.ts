import { describe, expect, it } from "vitest";
import {
  capMessages,
  pruneSessions,
  stripPageContext,
  stripToolParts,
  titleFromMessages,
} from "./chat-store-logic";
import type { UIMessage } from "ai";

const textMsg = (id: string, text: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text }],
});
const toolMsg = (id: string): UIMessage => ({
  id,
  role: "assistant",
  parts: [
    {
      type: "dynamic-tool",
      toolName: "search-courses",
      toolCallId: "t1",
      state: "output-available",
      input: { q: "CS101" },
      output: { rows: 1 },
    },
  ],
});

describe("chat-store-logic", () => {
  it("removes tool parts entirely (tool-only message ends with zero parts)", () => {
    const [m] = stripToolParts([toolMsg("a1")]);
    expect(m!.parts).toHaveLength(0);
  });

  it("removes tool parts entirely instead of keeping hollow shells", () => {
    const messages = [
      {
        id: "u1",
        role: "user",
        parts: [{ type: "text", text: "find courses" }],
      },
      {
        id: "a1",
        role: "assistant",
        parts: [
          { type: "step-start" },
          {
            type: "tool-invocation",
            toolCallId: "t1",
            toolName: "search",
            state: "output-available",
            input: {},
            output: {},
          },
          { type: "text", text: "here you go" },
        ],
      },
    ] as unknown as UIMessage[];
    const out = stripToolParts(messages);
    expect(out[1]!.parts.map((p) => p.type)).toEqual(["step-start", "text"]);
  });

  it("preserves non-tool parts while dropping tool parts", () => {
    const msg = {
      id: "a2",
      role: "assistant",
      parts: [
        { type: "text", text: "hello" },
        {
          type: "tool-search-courses",
          toolCallId: "t2",
          state: "output-available",
          input: { q: "x" },
          output: { rows: [] },
        },
        { type: "text", text: "world" },
      ],
    } as unknown as UIMessage;
    const [out] = stripToolParts([msg]);
    expect(out!.parts.map((p) => p.type)).toEqual(["text", "text"]);
    expect(out!.parts.map((p) => (p as { text?: string }).text)).toEqual([
      "hello",
      "world",
    ]);
  });

  it("caps at MAX_SESSION_MESSAGES keeping the newest", () => {
    const many = Array.from({ length: 250 }, (_, i) =>
      textMsg(`m${i}`, `msg ${i}`),
    );
    const capped = capMessages(many);
    expect(capped).toHaveLength(200);
    expect(capped[0]!.id).toBe("m50");
  });

  it("titles from the first user text part", () => {
    expect(
      titleFromMessages([textMsg("u", "   Ask about COR-IS1702   ")]),
    ).toBe("Ask about COR-IS1702");
    expect(titleFromMessages([toolMsg("a")])).toBeNull();
  });

  it("keeps the newest 50 sessions", () => {
    const sessions = Array.from({ length: 60 }, (_, i) => ({ id: `s${i}` }));
    expect(pruneSessions(sessions)).toHaveLength(50);
    expect(pruneSessions(sessions)[0]).toEqual({ id: "s10" });
  });

  it("strips page_context blocks from text before persist", () => {
    const block =
      "<page_context>\nUser is viewing /bidding/analytics\n</page_context>";
    const [out] = stripPageContext([
      textMsg("u", `what about this course?${block}`),
    ]);
    expect((out!.parts[0] as { text: string }).text).toBe(
      "what about this course?",
    );
  });

  it("capMessages strips both tool parts and page_context blocks", () => {
    const block = "<page_context>\nUser is viewing /x\n</page_context>";
    const capped = capMessages([textMsg("u", `q${block}`), toolMsg("a")]);
    expect((capped[0]!.parts[0] as { text: string }).text).toBe("q");
    expect(capped[1]!.parts).toHaveLength(0);
  });

  it("tolerates parts-less messages in strip/title helpers", () => {
    const bare = { id: "u", role: "user" } as unknown as UIMessage;
    expect(() => stripToolParts([bare])).not.toThrow();
    expect(() => stripPageContext([bare])).not.toThrow();
    expect(titleFromMessages([bare])).toBeNull();
  });
});
