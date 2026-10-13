import { describe, it, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("trpc react cache no-store", () => {
  it("uses cache:no-store so invalidate refetches are not stale", async () => {
    const fetchSpy = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ result: { data: { ok: true } } }), {
          headers: { "content-type": "application/json" },
        }),
    );
    // Simulate the fetch wrapper from trpc/react.tsx
    const wrappedFetch = (url: string, init?: RequestInit) =>
      fetchSpy(url, { ...init, cache: "no-store" as RequestCache });
    await wrappedFetch("/api/trpc/timetable.getArrangement?input=%7B%7D", {});
    const [, init] = fetchSpy.mock.calls[0] ?? [];
    expect(init?.cache).toBe("no-store");
  });

  it("react.tsx actually contains cache:no-store fetch wrapper", () => {
    const reactPath = path.resolve(import.meta.dirname, "./react.tsx");
    const src = fs.readFileSync(reactPath, "utf-8");
    expect(src).toContain('cache: "no-store"');
    expect(src).toContain("httpBatchStreamLink");
    // Ensure comment is present per brief Step 4
    expect(src).toContain(
      "Never let the browser serve tRPC responses from its HTTP cache",
    );
  });

  it("does not set a TTL Cache-Control on tRPC route", async () => {
    // Read next.config.js as text to avoid executing its jiti/env side-effects
    // in vitest. If the file were imported via ESM it would trigger env
    // validation and withSentryConfig wrapping.
    const configPath = path.resolve(
      import.meta.dirname,
      "../../../../next.config.js",
    );
    const raw = fs.readFileSync(configPath, "utf-8");
    // Must not contain a trpc Cache-Control block (dropped 43c0bdf)
    const hasTrpcCacheBlock =
      raw.includes("/api/trpc/:path*") &&
      raw.includes("Cache-Control") &&
      raw.includes("max-age=60");
    expect(hasTrpcCacheBlock).toBe(false);
    // More strictly: no source entry for /api/trpc at all should have Cache-Control
    expect(raw).not.toMatch(/source:\s*["']\/api\/trpc\/:path\*\s*["']/);
  });
});
