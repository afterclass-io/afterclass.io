import { describe, expect, it } from "vitest";
import { applyTokenBudget } from "./trim";

const msg = (id: string, text: string) => ({ role: "user" as const, content: [{ type: "text" as const, text }] });

describe("applyTokenBudget", () => {
  it("keeps everything under budget", () => {
    const msgs = [msg("a", "hello"), msg("b", "world")];
    expect(applyTokenBudget(msgs, 10_000)).toHaveLength(2);
  });

  it("drops oldest messages until under budget, newest kept", () => {
    const msgs = [msg("a", "x".repeat(2000)), msg("b", "y".repeat(2000)), msg("c", "z".repeat(2000))];
    const out = applyTokenBudget(msgs, 1200); // roughly allows ~1 message
    expect(out.length).toBeLessThan(3);
    expect(out[out.length - 1]).toBe(msgs[msgs.length - 1]);
  });

  it("keeps the head message as a stable prefix", () => {
    const msgs = [0, 1, 2, 3, 4].map((i) => msg(`m${i}`, String(i).repeat(2000)));
    const out = applyTokenBudget(msgs, 1200); // fits ~2 messages
    expect(out[0]).toBe(msgs[0]);
    expect(out[out.length - 1]).toBe(msgs[msgs.length - 1]);
  });

  it("drops a contiguous middle block, not the head", () => {
    const msgs = [0, 1, 2, 3, 4, 5].map((i) => msg(`m${i}`, String(i).repeat(1500)));
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
    const msgs = [0, 1, 2, 3, 4, 5].map((i) => msg(`m${i}`, String(i).repeat(2000)));
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
