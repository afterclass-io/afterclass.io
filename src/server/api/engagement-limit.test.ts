import { describe, expect, it, vi, afterEach } from "vitest";
import { checkAndIncrement, clientKey, resetLimits, getBucketCount } from "./engagement-limit";

describe("checkAndIncrement", () => {
  afterEach(() => resetLimits());

  it("allows up to the limit then blocks within the window", () => {
    vi.useFakeTimers();
    const key = "r1:127.0.0.1";
    expect(checkAndIncrement(key, 3, 60_000)).toBe(true);
    expect(checkAndIncrement(key, 3, 60_000)).toBe(true);
    expect(checkAndIncrement(key, 3, 60_000)).toBe(true);
    expect(checkAndIncrement(key, 3, 60_000)).toBe(false);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = "r1:127.0.0.1";
    checkAndIncrement(key, 3, 60_000);
    vi.advanceTimersByTime(60_001);
    expect(checkAndIncrement(key, 3, 60_000)).toBe(true);
    vi.useRealTimers();
  });

  it("prunes expired entries when Map reaches MAX_BUCKETS", () => {
    vi.useFakeTimers();
    // Fill map with 1000 entries, each with a 1s window and limit 1
    for (let i = 0; i < 1000; i++) {
      checkAndIncrement(`key-${i}`, 1, 1000);
    }
    expect(getBucketCount()).toBe(1000);
    // Advance past all windows — all entries are now expired
    vi.advanceTimersByTime(2000);
    // Next call triggers pruning of all 1000 expired entries
    checkAndIncrement("fresh", 1, 60_000);
    // Should have only "fresh" remaining (all expired were pruned)
    expect(getBucketCount()).toBe(1);
    // A previously-at-limit expired key should work again
    expect(checkAndIncrement("key-0", 1, 60_000)).toBe(true);
    vi.useRealTimers();
  });

  it("evicts oldest entry when Map is full with no expired entries", () => {
    vi.useFakeTimers();
    // Fill map with 1000 active entries (1-hour window, none expire)
    for (let i = 0; i < 1000; i++) {
      checkAndIncrement(`key-${i}`, 1, 3_600_000);
    }
    expect(getBucketCount()).toBe(1000);
    // Next call: no expired entries to prune, so oldest ("key-0") is evicted
    checkAndIncrement("new-key", 1, 3_600_000);
    // Map should still be at 1000 (one evicted, one added)
    expect(getBucketCount()).toBe(1000);
    // "key-0" was evicted, so a new bucket is created for it
    expect(checkAndIncrement("key-0", 1, 3_600_000)).toBe(true);
    vi.useRealTimers();
  });
});

describe("clientKey", () => {
  it("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "1.1.1.1",
      "x-forwarded-for": "2.2.2.2",
    });
    expect(clientKey(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-forwarded-for when x-vercel-forwarded-for is absent", () => {
    const headers = new Headers({ "x-forwarded-for": "2.2.2.2" });
    expect(clientKey(headers)).toBe("2.2.2.2");
  });

  it("returns unknown when neither header is present", () => {
    const headers = new Headers();
    expect(clientKey(headers)).toBe("unknown");
  });

  it("takes first IP from comma-separated x-vercel-forwarded-for", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "1.1.1.1, 2.2.2.2",
    });
    expect(clientKey(headers)).toBe("1.1.1.1");
  });

  it("trims whitespace from header value", () => {
    const headers = new Headers({
      "x-vercel-forwarded-for": "  1.1.1.1  ",
    });
    expect(clientKey(headers)).toBe("1.1.1.1");
  });
});
