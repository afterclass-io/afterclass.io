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
  it("accepts a bare course-code question with no domain noun", () => {
    expect(isInScope("Have I already taken is215?")).toBe(true);
  });
  it("accepts pronoun follow-ups after an in-scope turn", () => {
    expect(
      isInScope(
        "what did students say about him specifically",
        "reviews about fang bingxu",
      ),
    ).toBe(true);
  });
  it("still refuses follow-ups after an off-topic turn", () => {
    expect(
      isInScope("tell me more about him", "reverse a linked list please"),
    ).toBe(false);
  });
  it("still refuses standalone follow-up fragments", () => {
    expect(isInScope("tell me more about him")).toBe(false);
  });
});
