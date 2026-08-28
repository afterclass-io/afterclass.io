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
});
