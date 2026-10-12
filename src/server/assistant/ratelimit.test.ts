import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// vi.mock factories are hoisted above top-level const declarations, so the mock
// fns must be created via vi.hoisted to avoid a TDZ ("Cannot access ... before
// initialization") error.
const {
  mockQueryRaw,
  mockExecuteRaw,
  txRateLimitWindowFindUnique,
  txRateLimitWindowUpsert,
  txRateLimitWindowUpdateMany,
  mockTxTransaction,
} = vi.hoisted(() => ({
  mockQueryRaw: vi.fn() as Mock,
  mockExecuteRaw: vi.fn() as Mock,
  txRateLimitWindowFindUnique: vi.fn() as Mock,
  txRateLimitWindowUpsert: vi.fn() as Mock,
  txRateLimitWindowUpdateMany: vi.fn() as Mock,
  mockTxTransaction: vi.fn() as Mock,
}));

vi.mock("@/server/db", () => ({
  db: {
    $queryRaw: mockQueryRaw,
    $executeRaw: mockExecuteRaw,
    rateLimitWindow: {
      findUnique: txRateLimitWindowFindUnique,
      upsert: txRateLimitWindowUpsert,
      updateMany: txRateLimitWindowUpdateMany,
    },
  },
  txDb: {
    $transaction: mockTxTransaction,
  },
}));

import testCases from "./ratelimit.cases.json";
import {
  checkAndIncrement,
  peekRateLimit,
  pruneRateLimits,
  releaseRateLimit,
} from "./ratelimit";

describe("checkAndIncrement", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockQueryRaw.mockReset();
    mockExecuteRaw.mockReset();
    mockTxTransaction.mockReset();
    txRateLimitWindowFindUnique.mockReset();
    txRateLimitWindowUpsert.mockReset();
    txRateLimitWindowUpdateMany.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows when the statement returns a row", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ count: 1 }]);
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
  });

  it("blocks when the statement returns no row", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);
    const r = await checkAndIncrement("chat:u1", 10, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("sends one parameterized statement", async () => {
    const now = 1700000000000;
    vi.setSystemTime(now);
    const windowMs = 60_000;
    const windowStart = Math.floor(now / windowMs) * windowMs;

    mockQueryRaw.mockResolvedValueOnce([{ count: 1 }]);
    await checkAndIncrement("chat:u1", 10, 1);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const rawCall = mockQueryRaw.mock.calls[0] as [string[], ...unknown[]];
    const sql = rawCall[0].join("");
    const params = rawCall.slice(1);

    expect(sql).toContain('INSERT INTO "rate_limit"');
    expect(sql).toContain('ON CONFLICT ("key") DO UPDATE');
    expect(sql).toContain('WHERE r."count" <');
    expect(sql).toContain("RETURNING");
    expect(params).toEqual([`chat:u1:${windowStart}`, BigInt(windowStart), 10]);
  });

  it("sets updated_at in SQL", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ count: 1 }]);
    await checkAndIncrement("chat:u1", 10, 1);

    const rawCall = mockQueryRaw.mock.calls[0] as [string[], ...unknown[]];
    const sql = rawCall[0].join("");
    expect(sql).toContain("\"updated_at\" = (now() AT TIME ZONE 'UTC')");
  });

  it("uses no transaction", async () => {
    mockQueryRaw.mockResolvedValueOnce([{ count: 1 }]);
    await checkAndIncrement("chat:u1", 10, 1);

    expect(mockTxTransaction).not.toHaveBeenCalled();
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it("window math cases", async () => {
    for (const tc of testCases) {
      mockQueryRaw.mockReset();
      vi.setSystemTime(new Date(tc.nowIso));
      mockQueryRaw.mockResolvedValueOnce([]);

      const r = await checkAndIncrement("chat:u1", 10, tc.windowMinutes);
      expect(r.ok).toBe(false);
      expect(r.retryAfterSeconds).toBe(tc.expectedRetryAfterSeconds);

      expect(mockQueryRaw).toHaveBeenCalledTimes(1);
      const rawCall = mockQueryRaw.mock.calls[0] as [string[], ...unknown[]];
      const params = rawCall.slice(1);
      const expectedStartMs = Date.parse(tc.expectedWindowStart);
      expect(params[0]).toBe(`chat:u1:${expectedStartMs}`);
      expect(params[1]).toEqual(BigInt(expectedStartMs));
    }
  });

  it("limit below 1", async () => {
    for (const limit of [0, -1]) {
      mockQueryRaw.mockReset();
      const r = await checkAndIncrement("chat:u1", limit, 1);
      expect(r.ok).toBe(false);
      expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(mockQueryRaw).not.toHaveBeenCalled();
    }
  });

  it("propagates store errors", async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error("P2024"));
    await expect(checkAndIncrement("chat:u1", 10, 1)).rejects.toThrow("P2024");
  });
});

describe("peekRateLimit", () => {
  beforeEach(() => {
    txRateLimitWindowFindUnique.mockReset();
    txRateLimitWindowUpsert.mockReset();
    txRateLimitWindowUpdateMany.mockReset();
  });

  it("returns ok: true when no row exists without creating or incrementing a row", async () => {
    txRateLimitWindowFindUnique.mockResolvedValue(null);
    const r = await peekRateLimit("k", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
    expect(txRateLimitWindowUpsert).not.toHaveBeenCalled();
    expect(txRateLimitWindowUpdateMany).not.toHaveBeenCalled();
    expect(txRateLimitWindowFindUnique).toHaveBeenCalledWith({
      where: { key: expect.stringContaining("k:") as string },
      select: { count: true },
    });
  });

  it("returns ok: false and retryAfterSeconds >= 1 when count equals limit", async () => {
    txRateLimitWindowFindUnique.mockResolvedValue({ count: 10 });
    const r = await peekRateLimit("k", 10, 1);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(txRateLimitWindowUpsert).not.toHaveBeenCalled();
    expect(txRateLimitWindowUpdateMany).not.toHaveBeenCalled();
  });

  it("returns ok: true when count is limit - 1", async () => {
    txRateLimitWindowFindUnique.mockResolvedValue({ count: 9 });
    const r = await peekRateLimit("k", 10, 1);
    expect(r).toEqual({ ok: true, retryAfterSeconds: 0 });
  });
});

describe("releaseRateLimit", () => {
  beforeEach(() => mockExecuteRaw.mockReset());

  it("sends one parameterized update for the current window row", async () => {
    mockExecuteRaw.mockResolvedValue(1);
    await releaseRateLimit("k", 5);
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = mockExecuteRaw.mock.calls[0] as [
      string[],
      ...unknown[],
    ];
    expect(strings.join("?")).toContain('GREATEST("count" - 1, 0)');
    expect(values).toHaveLength(1);
    expect(values[0]).toEqual(expect.stringMatching(/^k:\d+$/));
  });
});

describe("pruneRateLimits", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockExecuteRaw.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prune single short batch", async () => {
    mockExecuteRaw.mockResolvedValueOnce(7);
    const r = await pruneRateLimits();
    expect(r).toEqual({ deleted: 7 });
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1);
    const rawCall = mockExecuteRaw.mock.calls[0] as [string[], ...unknown[]];
    const cutoffParam = rawCall[1];
    expect(typeof cutoffParam).toBe("bigint");
    expect((cutoffParam as bigint) < BigInt(Date.now())).toBe(true);
  });

  it("prune continues on full batches", async () => {
    mockExecuteRaw
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(5);
    const r = await pruneRateLimits();
    expect(mockExecuteRaw).toHaveBeenCalledTimes(3);
    expect(r).toEqual({ deleted: 2005 });
  });

  it("prune stops at the time budget", async () => {
    vi.useFakeTimers();
    const now = 1700000000000;
    vi.setSystemTime(now);
    mockExecuteRaw.mockImplementation(async () => {
      if (mockExecuteRaw.mock.calls.length === 2) {
        vi.advanceTimersByTime(8001);
      }
      return 1000;
    });
    const r = await pruneRateLimits();
    expect(mockExecuteRaw).toHaveBeenCalledTimes(2);
    expect(r).toEqual({ deleted: 2000 });
  });
});
