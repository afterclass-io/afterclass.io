import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.hoisted(() => {
  // OAuth-mounted (production-shaped) instance: NODE_ENV=production disables
  // the dev bypass in src/mcp/server.ts, so the OAuth metadata middleware is
  // mounted. MCP_URL pins the canonical resource host (mcp-use requires an
  // origin-only value; the /api/mcp basePath is appended by the library).
  // Must run before the route import below (instance built at import time).
  // `as Record<...>` — lib.dom/next-env types NODE_ENV as readonly.
  (process.env as Record<string, string>).NODE_ENV = "production";
  (process.env as Record<string, string>).MCP_URL = "http://localhost";
  (process.env as Record<string, string>).MCP_USE_OAUTH_SUPABASE_URL =
    "http://localhost:54321";
});

describe("well-known OAuth discovery route", () => {
  // NOTE: importing the route constructs a dedicated MCP server instance
  // (Prisma/tRPC graph, ~4s cold; slower under full-suite CPU contention).
  it("serves the protected-resource metadata for /api/mcp", async () => {
    const route = await import("./route");
    expect(typeof route.GET).toBe("function");
    expect(typeof route.OPTIONS).toBe("function");
    expect(route.runtime).toBe("nodejs");
    const res = await route.GET(
      new Request(
        "http://localhost/.well-known/oauth-protected-resource/api/mcp",
        { headers: { accept: "application/json" } },
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as {
      resource?: string;
      authorization_servers?: string[];
    };
    expect(body.resource).toBe("http://localhost/api/mcp");
    expect(body.authorization_servers).toEqual([
      "http://localhost:54321/auth/v1",
    ]);
  }, 30_000);
});
