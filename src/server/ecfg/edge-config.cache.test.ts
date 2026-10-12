import { beforeEach, describe, expect, it, vi } from "vitest";

import fallbackConfig from "@/server/ecfg/config.json";

const m = vi.hoisted(() => ({
  getAll: vi.fn(),
  cacheOptions: undefined as { revalidate: number; tags: string[] } | undefined,
  cacheKeys: undefined as string[] | undefined,
}));

vi.mock("@vercel/edge-config", () => ({ getAll: m.getAll }));

// Stand-in for the Next.js data cache: remembers the first resolved value
// and, like the real primitive, stores nothing when the function throws.
vi.mock("next/cache", () => ({
  unstable_cache: <T>(
    fn: () => Promise<T>,
    keys: string[],
    options: { revalidate: number; tags: string[] },
  ) => {
    m.cacheKeys = keys;
    m.cacheOptions = options;
    let stored: { value: T } | undefined;
    return async () => {
      stored ??= { value: await fn() };
      return stored.value;
    };
  },
}));

// The mock above records the options while the module loads. A mocked
// `unstable_cache` keeps one cache per module instance, so reset between tests.
beforeEach(() => {
  vi.resetModules();
  m.getAll.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

async function load() {
  return import("@/server/ecfg/edge-config");
}

describe("getEdgeConfig caching", () => {
  it("tags the cached read and sets a revalidation window", async () => {
    const { EDGE_CONFIG_CACHE_TAG } = await load();

    expect(EDGE_CONFIG_CACHE_TAG).toBe("edge-config");
    expect(m.cacheOptions?.tags).toEqual([EDGE_CONFIG_CACHE_TAG]);
    expect(m.cacheOptions?.revalidate).toBeGreaterThanOrEqual(3600);
  });

  it("does not cache a failed read, so the fallback is not pinned", async () => {
    m.getAll
      .mockRejectedValueOnce(new Error("edge outage"))
      .mockResolvedValueOnce({
        enableReviewSort: !fallbackConfig.enableReviewSort,
      });
    const { getEdgeConfig } = await load();

    const during = await getEdgeConfig();
    const after = await getEdgeConfig();

    expect(during.enableReviewSort).toBe(fallbackConfig.enableReviewSort);
    expect(after.enableReviewSort).toBe(!fallbackConfig.enableReviewSort);
    expect(m.getAll).toHaveBeenCalledTimes(2);
  });

  it("still validates each key on every call, not only on a cache miss", async () => {
    m.getAll.mockResolvedValue({ enableReviewSort: "yes" });
    const { getEdgeConfig } = await load();

    const first = await getEdgeConfig();
    const second = await getEdgeConfig();

    expect(first.enableReviewSort).toBe(fallbackConfig.enableReviewSort);
    expect(second.enableReviewSort).toBe(fallbackConfig.enableReviewSort);
    expect(m.getAll).toHaveBeenCalledTimes(1);
  });
});
