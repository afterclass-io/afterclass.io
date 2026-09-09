import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_BASE_URL,
  DEFAULT_LLM_MODEL,
  resolveLlmEnv,
} from "./providers";

describe("resolveLlmEnv", () => {
  it("throws fail-closed when both OPENROUTER_API_KEY and LLM_API_KEY are missing (no empty-string fallback)", () => {
    expect(() =>
      resolveLlmEnv({
        OPENROUTER_API_KEY: undefined,
        LLM_API_KEY: undefined,
        LLM_BASE_URL: undefined,
        LLM_MODEL: undefined,
      }),
    ).toThrow(/OPENROUTER_API_KEY.*LLM_API_KEY/);
    expect(() =>
      resolveLlmEnv({
        OPENROUTER_API_KEY: "",
        LLM_API_KEY: "",
        LLM_BASE_URL: undefined,
        LLM_MODEL: undefined,
      }),
    ).toThrow(/OPENROUTER_API_KEY.*LLM_API_KEY/);
  });
  it("prefers OPENROUTER_API_KEY over the LLM_API_KEY fallback", () => {
    expect(
      resolveLlmEnv({
        OPENROUTER_API_KEY: "or-key",
        LLM_API_KEY: "legacy-key",
        LLM_BASE_URL: undefined,
        LLM_MODEL: undefined,
      }),
    ).toEqual({
      apiKey: "or-key",
      baseURL: DEFAULT_LLM_BASE_URL,
      model: DEFAULT_LLM_MODEL,
    });
  });
  it("falls back to LLM_API_KEY when OPENROUTER_API_KEY is unset", () => {
    expect(
      resolveLlmEnv({
        OPENROUTER_API_KEY: undefined,
        LLM_API_KEY: "legacy-key",
        LLM_BASE_URL: undefined,
        LLM_MODEL: undefined,
      }),
    ).toEqual({
      apiKey: "legacy-key",
      baseURL: DEFAULT_LLM_BASE_URL,
      model: DEFAULT_LLM_MODEL,
    });
  });
  it("falls back to baseURL/model defaults when only the key is set", () => {
    expect(
      resolveLlmEnv({
        OPENROUTER_API_KEY: "k",
        LLM_BASE_URL: undefined,
        LLM_MODEL: undefined,
      }),
    ).toEqual({
      apiKey: "k",
      baseURL: DEFAULT_LLM_BASE_URL,
      model: DEFAULT_LLM_MODEL,
    });
  });
  it("prefers LLM_* overrides when set", () => {
    expect(
      resolveLlmEnv({
        OPENROUTER_API_KEY: "custom",
        LLM_BASE_URL: "https://x.com",
        LLM_MODEL: "m1",
      }),
    ).toEqual({
      apiKey: "custom",
      baseURL: "https://x.com",
      model: "m1",
    });
  });
  it("exposes OpenRouter preset default constants", () => {
    expect(DEFAULT_LLM_BASE_URL).toBe("https://openrouter.ai/api/v1");
    expect(DEFAULT_LLM_MODEL).toBe("@preset/afterclass");
  });
});
