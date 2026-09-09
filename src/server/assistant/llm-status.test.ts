import { describe, expect, it, vi } from "vitest";
import { isLlmConfigured } from "./llm-status";

describe("isLlmConfigured", () => {
  // NOTE (Task 1): this test runs FIRST in the file on purpose. The
  // implementation warns only once per module lifetime (module-level flag),
  // so any earlier missing-key call would consume the single log and this
  // assertion would never see it.
  it("logs once when missing (warn, not throw)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    isLlmConfigured({
      OPENROUTER_API_KEY: undefined,
      LLM_API_KEY: undefined,
    });
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("OPENROUTER_API_KEY"),
    );
    err.mockRestore();
  });
  it("returns false when neither key is set or both are empty", () => {
    expect(
      isLlmConfigured({
        OPENROUTER_API_KEY: undefined,
        LLM_API_KEY: undefined,
      }),
    ).toBe(false);
    expect(isLlmConfigured({ OPENROUTER_API_KEY: "", LLM_API_KEY: "" })).toBe(
      false,
    );
  });
  it("returns true when either key is present", () => {
    expect(isLlmConfigured({ OPENROUTER_API_KEY: "k" })).toBe(true);
    expect(isLlmConfigured({ LLM_API_KEY: "k" })).toBe(true);
    expect(
      isLlmConfigured({ OPENROUTER_API_KEY: "k", LLM_API_KEY: "k2" }),
    ).toBe(true);
  });
});
