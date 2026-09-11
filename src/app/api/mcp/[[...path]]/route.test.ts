import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.hoisted(() => {
  // src/mcp/server.ts wires OAuth from isDevBypass(): development + flag
  // omits the provider entirely (no bearer middleware), so the real
  // singleton can be imported in-process without Supabase env vars or
  // tokens. Same seeding as src/mcp/serialization.test.ts (mirrors what
  // scripts/mcp-dev.ts sets). Must run before the dynamic route imports
  // below (the singleton is constructed at import time).
  // `as Record<...>` — lib.dom/next-env types NODE_ENV as readonly.
  (process.env as Record<string, string>).NODE_ENV = "development";
  (process.env as Record<string, string>).MCP_DEV_BYPASS = "true";
});

describe("MCP route exports", () => {
  // NOTE: importing ./route constructs the dedicated /api/mcp server
  // (Prisma/tRPC graph, ~8s cold; far slower under full-suite CPU
  // contention — observed >30s). The 120s budget keeps this deterministic;
  // a tight budget flakes under load and the timeout then cascades into
  // the tests below. Tests run sequentially in-file (default sequence)
  // so the single import cost is paid once.
  it("exposes GET/POST/DELETE/OPTIONS with nodejs runtime and 300s duration", async () => {
    const route = await import("./route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.POST).toBe("function");
    expect(typeof route.DELETE).toBe("function");
    expect(typeof route.OPTIONS).toBe("function");
    expect(route.runtime).toBe("nodejs");
    expect(route.maxDuration).toBe(300);
  }, 120_000);

  it("OPTIONS returns 204 with MCP CORS headers", async () => {
    const route = await import("./route");
    const res = await route.OPTIONS(new Request("http://localhost/api/mcp"));
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Expose-Headers")).toContain(
      "Mcp-Session-Id",
    );
  });
});
