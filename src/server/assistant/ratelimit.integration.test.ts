import { describe, expect, it, vi } from "vitest";

// Point the module-level clients (used by checkAndIncrement) at the Testcontainers database.
vi.mock("@/server/db", async () => {
  const { idb } = await import("@/server/api/integration-test-helpers");
  return { db: idb, txDb: idb };
});

import { idb as db } from "@/server/api/integration-test-helpers";
import { checkAndIncrement } from "./ratelimit";

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
