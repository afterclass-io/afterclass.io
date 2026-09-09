import { describe, expect, it } from "vitest";
import { isLlmConfigured } from "./llm-status";
import { resolveLlmEnv } from "./providers";

/**
 * Degraded-mode contract: without `LLM_API_KEY` the app degrades instead of
 * dying at boot. `isLlmConfigured` is the never-throwing gate (route 503 +
 * status `aiDegraded`); `resolveLlmEnv` stays fail-closed at the per-turn
 * `getModel()` call site so a misconfiguration is still loud there.
 */
describe("providers degraded mode", () => {
  it("isLlmConfigured is false for a missing key while resolveLlmEnv throws", () => {
    expect(isLlmConfigured({ LLM_API_KEY: undefined })).toBe(false);
    expect(() => resolveLlmEnv({ LLM_API_KEY: undefined })).toThrowError(
      /LLM_API_KEY/,
    );
  });

  it("isLlmConfigured is true when the key is set and resolveLlmEnv uses it", () => {
    expect(isLlmConfigured({ LLM_API_KEY: "k" })).toBe(true);
    expect(resolveLlmEnv({ LLM_API_KEY: "k" })).toMatchObject({ apiKey: "k" });
  });
});
