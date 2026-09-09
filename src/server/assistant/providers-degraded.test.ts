import { describe, expect, it } from "vitest";
import { isLlmConfigured } from "./llm-status";
import { resolveLlmEnv } from "./providers";

/**
 * Degraded-mode contract (Task 1): without `OPENROUTER_API_KEY` (or the
 * `LLM_API_KEY` fallback) the app degrades instead of dying at boot.
 * `isLlmConfigured` is the never-throwing gate (route 503 + status
 * `aiDegraded`); `resolveLlmEnv` stays fail-closed at the per-turn
 * `getModel()` call site so a misconfiguration is still loud there.
 */
describe("providers degraded mode", () => {
  it("isLlmConfigured is false for missing keys while resolveLlmEnv throws", () => {
    expect(
      isLlmConfigured({
        OPENROUTER_API_KEY: undefined,
        LLM_API_KEY: undefined,
      }),
    ).toBe(false);
    expect(() =>
      resolveLlmEnv({
        OPENROUTER_API_KEY: undefined,
        LLM_API_KEY: undefined,
      }),
    ).toThrowError(/OPENROUTER_API_KEY/);
  });

  it("isLlmConfigured is true for either key and resolveLlmEnv prefers OPENROUTER_API_KEY", () => {
    expect(isLlmConfigured({ OPENROUTER_API_KEY: "k" })).toBe(true);
    expect(isLlmConfigured({ LLM_API_KEY: "k" })).toBe(true);
    expect(
      resolveLlmEnv({ OPENROUTER_API_KEY: "or", LLM_API_KEY: "legacy" }),
    ).toMatchObject({ apiKey: "or" });
    expect(resolveLlmEnv({ LLM_API_KEY: "k" })).toMatchObject({ apiKey: "k" });
  });
});
