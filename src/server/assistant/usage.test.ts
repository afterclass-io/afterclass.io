import { describe, expect, it } from "vitest";
import { extractCachedInputTokens } from "./usage";

describe("extractCachedInputTokens", () => {
  it("reads the AI SDK normalised field", () => {
    expect(
      extractCachedInputTokens({ inputTokenDetails: { cacheReadTokens: 123 } }),
    ).toBe(123);
  });

  it("reads a provider's native prompt_cache_hit_tokens on raw", () => {
    expect(extractCachedInputTokens({ raw: { prompt_cache_hit_tokens: 456 } })).toBe(456);
  });

  it("reads prompt_tokens_details.cached_tokens on raw", () => {
    expect(
      extractCachedInputTokens({ raw: { prompt_tokens_details: { cached_tokens: 78 } } }),
    ).toBe(78);
  });

  it("returns 0 for missing/invalid shapes and never throws", () => {
    expect(extractCachedInputTokens(undefined)).toBe(0);
    expect(extractCachedInputTokens(null)).toBe(0);
    expect(extractCachedInputTokens({})).toBe(0);
    expect(extractCachedInputTokens({ inputTokenDetails: { cacheReadTokens: NaN } })).toBe(0);
    expect(extractCachedInputTokens("nope")).toBe(0);
  });

  it("prefers the normalised field over raw", () => {
    expect(
      extractCachedInputTokens({
        inputTokenDetails: { cacheReadTokens: 1 },
        raw: { prompt_cache_hit_tokens: 2 },
      }),
    ).toBe(1);
  });
});
