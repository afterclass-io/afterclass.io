import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAll } from "@vercel/edge-config";
import { revalidateTag } from "next/cache";
import { getEdgeConfig } from "./EdgeConfigProvider";
import { EDGE_CONFIG_CACHE_TAG } from "@/server/ecfg/config";
import { POST } from "@/app/api/revalidate/route";

// `unstable_cache` / `revalidateTag` are Next.js runtime primitives that
// cannot run inside vitest. `unstable_cache` is mocked as a memoizing wrapper
// (first call runs the fn, later calls hit an in-memory store) so the cache
// behavior is exercised for real; `revalidateTag` is a spy.
const mockCacheStore = new Map<string, unknown>();
vi.mock("next/cache", () => ({
  unstable_cache:
    <T extends (...args: never[]) => unknown>(fn: T, keyParts?: string[]) =>
    async (...args: Parameters<T>) => {
      const key = JSON.stringify(keyParts ?? []);
      if (!mockCacheStore.has(key)) {
        mockCacheStore.set(key, await fn(...args));
      }
      return mockCacheStore.get(key);
    },
  revalidateTag: vi.fn(),
}));

// The t3 env module snapshots `process.env` at import time, so it cannot be
// stubbed per-test. Mock it instead, reading a mutable `mock*` variable.
let mockRevalidateSecret: string | undefined;
vi.mock("@/env", () => ({
  env: {
    get REVALIDATE_SECRET() {
      return mockRevalidateSecret;
    },
  },
}));

vi.mock("next/server", () => ({
  NextRequest: class {
    headers: Headers;
    constructor(_url: string, init?: { headers?: Headers }) {
      this.headers = init?.headers ?? new Headers();
    }
  },
  NextResponse: class NextResponseStub {
    status: number;
    body: unknown;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    static json(body: unknown, init?: { status?: number }) {
      return new NextResponseStub(body, init);
    }
  },
}));

vi.mock("@vercel/edge-config", () => ({ getAll: vi.fn() }));

const validConfig = {
  enableAnnouncementBanner: true,
  enableCmdkTooltip: true,
  enableReviewEventsTracking: true,
  enableReviewSort: true,
  enableReviewFilter: true,
  enableReviewReactions: true,
};

// Contents of src/server/ecfg/config.json — the committed fallback.
const fallbackConfig = {
  enableAnnouncementBanner: false,
  enableCmdkTooltip: true,
  enableReviewEventsTracking: true,
  enableReviewSort: true,
  enableReviewFilter: true,
  enableReviewReactions: true,
};

describe("getEdgeConfig caching (#518)", () => {
  const getAllMock = vi.mocked(getAll);

  beforeEach(() => {
    getAllMock.mockReset();
    mockCacheStore.clear();
  });

  it("wraps the edge config read in unstable_cache with a revalidation window and tag", () => {
    const providerSrc = fs.readFileSync(
      path.resolve(import.meta.dirname, "./EdgeConfigProvider.tsx"),
      "utf-8",
    );

    expect(providerSrc).toMatch(/unstable_cache\s*\(/);
    expect(providerSrc).toMatch(/revalidate:\s*86400/);
    expect(providerSrc).toContain(EDGE_CONFIG_CACHE_TAG);
    expect(EDGE_CONFIG_CACHE_TAG).toBe("edge-config");
  });

  it("serves a second getEdgeConfig call from cache without refetching", async () => {
    getAllMock.mockResolvedValue(validConfig);

    const first = await getEdgeConfig();
    const second = await getEdgeConfig();

    expect(getAllMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual(validConfig);
    expect(second).toEqual(first);
  });

  it("falls back to the committed config.json when the edge config fetch fails", async () => {
    getAllMock.mockRejectedValue(new Error("edge config unreachable"));

    await expect(getEdgeConfig()).resolves.toEqual(fallbackConfig);
  });
});

describe("POST /api/revalidate (#518)", () => {
  const revalidateTagMock = vi.mocked(revalidateTag);
  const makeRequest = (secret?: string) =>
    ({
      headers: secret
        ? new Headers({ "x-revalidate-secret": secret })
        : new Headers(),
    }) as Parameters<typeof POST>[0];

  beforeEach(() => {
    revalidateTagMock.mockClear();
    mockRevalidateSecret = "test-secret";
  });

  it("rejects requests without the revalidate secret", async () => {
    mockRevalidateSecret = undefined;
    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong secret", async () => {
    const res = await POST(makeRequest("wrong-secret"));

    expect(res.status).toBe(401);
    expect(revalidateTagMock).not.toHaveBeenCalled();
  });

  it("revalidates the edge-config tag when the secret matches", async () => {
    const res = await POST(makeRequest("test-secret"));

    expect(res.status).toBe(200);
    expect(revalidateTagMock).toHaveBeenCalledWith(EDGE_CONFIG_CACHE_TAG, {
      expire: 0,
    });
    expect(res.body).toMatchObject({
      revalidated: true,
      tag: EDGE_CONFIG_CACHE_TAG,
    });
  });
});
