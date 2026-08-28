import { describe, expect, it } from "vitest";
import { DEFAULT_LLM_BASE_URL, DEFAULT_LLM_MODEL, resolveLlmEnv } from "./providers";

describe("resolveLlmEnv", () => {
  it("falls back to defaults when LLM_* is unset", () => {
    expect(resolveLlmEnv({ LLM_API_KEY: undefined, LLM_BASE_URL: undefined, LLM_MODEL: undefined })).toEqual({
      apiKey: "",
      baseURL: DEFAULT_LLM_BASE_URL,
      model: DEFAULT_LLM_MODEL,
    });
  });
  it("prefers LLM_* when set", () => {
    expect(resolveLlmEnv({ LLM_API_KEY: "custom", LLM_BASE_URL: "https://x.com", LLM_MODEL: "m1" })).toEqual({
      apiKey: "custom",
      baseURL: "https://x.com",
      model: "m1",
    });
  });
  it("exposes neutral default constants", () => {
    expect(DEFAULT_LLM_BASE_URL).toBe("https://api.deepseek.com");
    expect(DEFAULT_LLM_MODEL).toBe("deepseek-v4-flash");
  });
});
