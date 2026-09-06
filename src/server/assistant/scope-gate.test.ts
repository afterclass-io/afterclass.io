// src/server/assistant/scope-gate.test.ts
import { describe, expect, it } from "vitest";
import { isInScope } from "./scope-gate";
describe("isInScope", () => {
  it("rejects off-topic coding questions before quota is touched", () => {
    expect(isInScope("reverse a linked list please")).toBe(false);
  });
  it("accepts bid planning questions", () => {
    expect(isInScope("should I bid 80 for ACCT102?")).toBe(true);
  });
});
