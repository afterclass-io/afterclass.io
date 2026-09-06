import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { applyTokenBudget, stripStalePageContext } from "./trim";

const msg = (id: string, text: string) => ({
  role: "user" as const,
  content: [{ type: "text" as const, text }],
});

describe("applyTokenBudget", () => {
  it("keeps everything under budget", () => {
    const msgs = [msg("a", "hello"), msg("b", "world")];
    expect(applyTokenBudget(msgs, 10_000)).toHaveLength(2);
  });

  it("drops oldest messages until under budget, newest kept", () => {
    const msgs = [
      msg("a", "x".repeat(2000)),
      msg("b", "y".repeat(2000)),
      msg("c", "z".repeat(2000)),
    ];
    const out = applyTokenBudget(msgs, 1200); // roughly allows ~1 message
    expect(out.length).toBeLessThan(3);
    expect(out[out.length - 1]).toBe(msgs[msgs.length - 1]);
  });

  it("keeps the head message as a stable prefix", () => {
    const msgs = [0, 1, 2, 3, 4].map((i) =>
      msg(`m${i}`, String(i).repeat(2000)),
    );
    const out = applyTokenBudget(msgs, 1200); // fits ~2 messages
    expect(out[0]).toBe(msgs[0]);
    expect(out[out.length - 1]).toBe(msgs[msgs.length - 1]);
  });

  it("drops a contiguous middle block, not the head", () => {
    const msgs = [0, 1, 2, 3, 4, 5].map((i) =>
      msg(`m${i}`, String(i).repeat(1500)),
    );
    const out = applyTokenBudget(msgs, 1200); // fits ~3 messages
    expect(out[0]).toBe(msgs[0]);
    expect(out[out.length - 1]).toBe(msgs[msgs.length - 1]);
    const kept = new Set(out.map((m) => msgs.findIndex((mm) => mm === m)));
    const removed = [0, 1, 2, 3, 4, 5].filter((i) => !kept.has(i));
    expect(removed.length).toBeGreaterThan(0);
    const first = removed[0] ?? -1;
    const last = removed[removed.length - 1] ?? -1;
    expect(first).toBe(1); // contiguous block starts right after the head
    expect(last).toBeLessThan(5); // ends before the tail
    // sorted + unique indices → contiguous run iff last - first === length - 1
    expect(last - first).toBe(removed.length - 1);
  });

  it("never returns an empty array", () => {
    const msgs = [msg("a", "x".repeat(2000))];
    const out = applyTokenBudget(msgs, 100);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe(msgs[0]);
  });

  it("handles empty input", () => {
    expect(applyTokenBudget([], 1000)).toEqual([]);
  });
  it("respects custom maxHeadMessages/minTailMessages options", () => {
    const msgs = [0, 1, 2, 3, 4, 5].map((i) =>
      msg(`m${i}`, String(i).repeat(2000)),
    );
    // maxHeadMessages: 2 keeps the first two messages as a stable prefix
    // (budget 1700 fits ~3 messages, so the preserved head+tail stays under budget
    // and the extreme fallback never drops the head anchors)
    const outHead = applyTokenBudget(msgs, 1700, { maxHeadMessages: 2 });
    expect(outHead[0]).toBe(msgs[0]);
    expect(outHead[1]).toBe(msgs[1]);
    expect(outHead[outHead.length - 1]).toBe(msgs[msgs.length - 1]);
    // minTailMessages: 2 keeps the last two messages
    const outTail = applyTokenBudget(msgs, 1700, { minTailMessages: 2 });
    expect(outTail[outTail.length - 2]).toBe(msgs[msgs.length - 2]);
    expect(outTail[outTail.length - 1]).toBe(msgs[msgs.length - 1]);
  });
});

const uiMsg = (
  id: string,
  role: "user" | "assistant",
  text: string,
): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

describe("stripStalePageContext", () => {
  it("strips blocks from older turns, keeping only the latest", () => {
    const old = "\n<page_context>\nUser is viewing /courses\n</page_context>";
    const latest =
      "\n<page_context>\nUser is viewing /bidding/analytics\n</page_context>";
    const messages = [
      uiMsg("u1", "user", `first q${old}`),
      uiMsg("a1", "assistant", "answer"),
      uiMsg("u2", "user", `second q${latest}`),
    ];
    const out = stripStalePageContext(messages);
    // The block match starts at "<page_context>"; the "\n" joining it to the
    // user text is outside the match and stays. Only block bytes are dropped.
    expect((out[0]!.parts[0] as { text: string }).text).toBe("first q\n");
    expect(out[2]).toBe(messages[2]);
  });

  it("leaves non-user messages and context-free history untouched", () => {
    const messages = [
      uiMsg("u1", "user", "hi"),
      uiMsg("a1", "assistant", "hello"),
    ];
    expect(stripStalePageContext(messages)).toEqual(messages);
  });

  it("tolerates parts-less messages", () => {
    const messages = [
      { id: "u1", role: "user" },
      uiMsg("u2", "user", "hi"),
    ] as unknown as UIMessage[];
    expect(() => stripStalePageContext(messages)).not.toThrow();
  });
});
