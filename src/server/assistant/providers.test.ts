import { describe, expect, it, vi } from "vitest";
import { DEFAULT_LLM_BASE_URL, getModel, resolveLlmEnv } from "./providers";

vi.mock("@/env", () => ({
  env: { LLM_API_KEY: "k", LLM_BASE_URL: undefined },
}));
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: vi.fn(async () => ({ llmModel: "shared-model" })),
}));

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

describe("getModel", () => {
  it("returns the configured llmModel for every caller", async () => {
    // The chat assistant and the moderation judge both call getModel() with
    // no argument, so they cannot resolve to different models.
    const model = await getModel();
    expect(model.modelId).toBe("shared-model");
  });
});
