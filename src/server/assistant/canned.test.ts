import { describe, expect, it } from "vitest";
import { findCannedAnswer, normalizePrompt } from "./canned";
import type { UIMessage } from "ai";

const userMsg = (text: string): UIMessage => ({ id: "u1", role: "user", parts: [{ type: "text", text }] });

describe("canned", () => {
  it("normalizes punctuation, case, and whitespace", () => {
    expect(normalizePrompt("What can you do??  NOW")).toBe("what can you do now");
  });
  it("finds a canned answer for the capabilities question", () => {
    expect(findCannedAnswer([userMsg("What are your capabilities?")])).toBeTruthy();
    expect(findCannedAnswer([userMsg("What can you do?")])).toBeTruthy();
  });
  it("matches the first welcome suggestion prompt as an exact canned phrase", () => {
    // WELCOME_SUGGESTIONS[0].prompt normalizes to an explicit CANNED key so the
    // suggestion chip stays quota-free without substring matching.
    expect(findCannedAnswer([userMsg("What are your capabilities? What can you help me with?")])).toBeTruthy();
  });
  it("does NOT short-circuit on a free-typed near-miss - it must reach the model", () => {
    // Free-typed questions that contain a canned key must NOT be treated as
    // canned; only normalized exact matches (the chips) are quota-free.
    expect(findCannedAnswer([userMsg("What can you do about my timetable?")])).toBeNull();
    expect(findCannedAnswer([userMsg("what can you do for CS101 bidding")])).toBeNull();
  });
  it("returns null for unknown prompts", () => {
    expect(findCannedAnswer([userMsg("search for CS101 courses")])).toBeNull();
  });
  it("returns null when the last message is not from the user", () => {
    const assistant: UIMessage = { id: "a1", role: "assistant", parts: [{ type: "text", text: "hi" }] };
    expect(findCannedAnswer([assistant])).toBeNull();
  });
  it("returns null for an empty conversation", () => {
    expect(findCannedAnswer([])).toBeNull();
  });
});
