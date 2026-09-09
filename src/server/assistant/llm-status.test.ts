import { describe, expect, it, vi } from "vitest";
import { isLlmConfigured } from "./llm-status";

describe("isLlmConfigured", () => {
  // NOTE (Task 1): this test runs FIRST in the file on purpose. The
  // implementation warns only once per module lifetime (module-level flag),
  // so any earlier missing-key call would consume the single log and this
  // assertion would never see it.
  it("logs once when missing (warn, not throw)", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    isLlmConfigured({ LLM_API_KEY: undefined });
    expect(err).toHaveBeenCalledWith(expect.stringContaining("LLM_API_KEY"));
    err.mockRestore();
  });
  it("returns false when key is missing or empty", () => {
    expect(isLlmConfigured({ LLM_API_KEY: undefined })).toBe(false);
    expect(isLlmConfigured({ LLM_API_KEY: "" })).toBe(false);
  });
  it("returns true when key is present", () => {
    expect(isLlmConfigured({ LLM_API_KEY: "k" })).toBe(true);
  });
});
