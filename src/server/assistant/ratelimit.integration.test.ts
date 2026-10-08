import { describe, expect, it, vi } from "vitest";

// Point the module-level clients (used by checkAndIncrement) at the Testcontainers database.
vi.mock("@/server/db", async () => {
  const { idb } = await import("@/server/api/integration-test-helpers");
  return { db: idb, txDb: idb };
});

import { idb as db } from "@/server/api/integration-test-helpers";
import { checkAndIncrement, pruneRateLimits } from "./ratelimit";
import pruneRowsFixture from "./ratelimit.prune-rows.json";

describe("checkAndIncrement integration", () => {
  it("50 parallel calls with limit 10", async () => {
    const key = `test:concurrent:${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 50 }, () => checkAndIncrement(key, 10, 1)),
    );
    const okCount = results.filter((r) => r.ok).length;
    const blockedCount = results.filter((r) => !r.ok).length;
    expect(okCount).toBe(10);
    expect(blockedCount).toBe(40);

    const row = await db.rateLimitWindow.findFirst({
      where: { key: { startsWith: `${key}:` } },
    });
    expect(row?.count).toBe(10);
  });

  it("window rolls over", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      const key = `test:rollover:${Date.now()}`;
      const r1 = await checkAndIncrement(key, 3, 1);
      const r2 = await checkAndIncrement(key, 3, 1);
      const r3 = await checkAndIncrement(key, 3, 1);
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      expect(r3.ok).toBe(true);

      const r4 = await checkAndIncrement(key, 3, 1);
      expect(r4.ok).toBe(false);

      vi.setSystemTime(Date.now() + 60_000);

      const r5 = await checkAndIncrement(key, 3, 1);
      expect(r5.ok).toBe(true);

      const rows = await db.rateLimitWindow.findMany({
        where: { key: { startsWith: `${key}:` } },
      });
      expect(rows).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("limit 1 gives one winner", async () => {
    const key = `test:limit1:${Date.now()}`;
    const results = await Promise.all(
      Array.from({ length: 20 }, () => checkAndIncrement(key, 1, 1)),
    );
    const okCount = results.filter((r) => r.ok).length;
    expect(okCount).toBe(1);
  });

  it("blocked call does not change the count", async () => {
    const key = `test:cap:${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await checkAndIncrement(key, 3, 1);
    }
    for (let i = 0; i < 5; i++) {
      const res = await checkAndIncrement(key, 3, 1);
      expect(res.ok).toBe(false);
    }
    const row = await db.rateLimitWindow.findFirst({
      where: { key: { startsWith: `${key}:` } },
    });
    expect(row?.count).toBe(3);
  });

  it("limit 0 touches nothing", async () => {
    const key = `test:limit0:${Date.now()}`;
    const res = await checkAndIncrement(key, 0, 1);
    expect(res.ok).toBe(false);
    const row = await db.rateLimitWindow.findFirst({
      where: { key: { startsWith: `${key}:` } },
    });
    expect(row).toBeNull();
  });

  it("retryAfterSeconds range", async () => {
    const key = `test:retry:${Date.now()}`;
    await checkAndIncrement(key, 1, 1);
    const blocked = await checkAndIncrement(key, 1, 1);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("updated_at is current UTC", async () => {
    const key = `test:updated_at:${Date.now()}`;
    await checkAndIncrement(key, 10, 1);
    const row = await db.rateLimitWindow.findFirst({
      where: { key: { startsWith: `${key}:` } },
    });
    expect(row).not.toBeNull();
    expect(Math.abs(Date.now() - row!.updatedAt.getTime())).toBeLessThan(
      60_000,
    );
  });

  it("distinct keys do not interact", async () => {
    const key1 = `test:distinct1:${Date.now()}`;
    const key2 = `test:distinct2:${Date.now()}`;
    const r1 = await checkAndIncrement(key1, 1, 1);
    const r2 = await checkAndIncrement(key2, 1, 1);
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
  });

  it("index exists", async () => {
    const rows = await db.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes WHERE tablename = 'rate_limit'`;
    const names = rows.map((r) => r.indexname);
    expect(names).toContain("rate_limit_window_start_idx");
  });
});

describe("pruneRateLimits integration", () => {
  it("prune deletes only old rows", async () => {
    // Other integration files share this database and write live rows, so
    // the test owns only the keys that start with "fixture:".
    await db.rateLimitWindow.deleteMany({
      where: { key: { startsWith: "fixture:" } },
    });
    const now = Date.now();
    const baseWindow = Math.floor(now / 60_000) * 60_000;

    await db.rateLimitWindow.createMany({
      data: pruneRowsFixture.map((row) => {
        const windowStart = BigInt(baseWindow - row.ageWindows * 60_000);
        return {
          key: `${row.keyPrefix}:${windowStart}`,
          windowStart,
          count: row.count,
        };
      }),
    });

    const expectedDeleted = pruneRowsFixture.filter(
      (r) => r.ageWindows > 1440,
    ).length;
    const res = await pruneRateLimits(1440, 1, 2);
    expect(res).toEqual({ deleted: expectedDeleted });

    const remainingRows = await db.rateLimitWindow.findMany({
      where: { key: { startsWith: "fixture:" } },
      orderBy: { windowStart: "asc" },
    });
    const expectedLive = pruneRowsFixture.filter(
      (r) => r.ageWindows <= 1440,
    ).length;
    expect(remainingRows).toHaveLength(expectedLive);
    for (const row of remainingRows) {
      expect(row.key).toContain("fixture:live");
    }
  });

  it("prune is idempotent", async () => {
    const res = await pruneRateLimits(1440, 1, 2);
    expect(res).toEqual({ deleted: 0 });
  });
});
