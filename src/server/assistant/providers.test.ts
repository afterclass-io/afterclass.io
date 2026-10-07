import { describe, expect, it } from "vitest";
import {
  DEFAULT_LLM_BASE_URL,
  resolveLlmEnv,
  resolveModelId,
} from "./providers";

describe("resolveLlmEnv", () => {
  it("throws fail-closed when LLM_API_KEY is missing (no empty-string fallback)", () => {
    expect(() =>
      resolveLlmEnv({
        LLM_API_KEY: undefined,
        LLM_BASE_URL: undefined,
      }),
    ).toThrow(/LLM_API_KEY/);
    expect(() =>
      resolveLlmEnv({
        LLM_API_KEY: "",
        LLM_BASE_URL: undefined,
      }),
    ).toThrow(/LLM_API_KEY/);
  });
  it("falls back to the baseURL default when only the key is set", () => {
    expect(
      resolveLlmEnv({
        LLM_API_KEY: "k",
        LLM_BASE_URL: undefined,
      }),
    ).toEqual({
      apiKey: "k",
      baseURL: DEFAULT_LLM_BASE_URL,
    });
  });
  it("prefers LLM_* overrides when set", () => {
    expect(
      resolveLlmEnv({
        LLM_API_KEY: "custom",
        LLM_BASE_URL: "https://x.com",
      }),
    ).toEqual({
      apiKey: "custom",
      baseURL: "https://x.com",
    });
  });
  it("exposes OpenRouter preset default constants", () => {
    expect(DEFAULT_LLM_BASE_URL).toBe("https://openrouter.ai/api/v1");
  });
});

describe("resolveModelId", () => {
  it("uses the assistant model for the assistant", () => {
    expect(
      resolveModelId("assistant", { llmModel: "a", moderationModel: "m" }),
    ).toBe("a");
  });
  it("uses the moderation override for moderation", () => {
    expect(
      resolveModelId("moderation", { llmModel: "a", moderationModel: "m" }),
    ).toBe("m");
  });
  it("falls back to the assistant model when no moderation override is set", () => {
    expect(
      resolveModelId("moderation", {
        llmModel: "a",
        moderationModel: undefined,
      }),
    ).toBe("a");
  });
});
