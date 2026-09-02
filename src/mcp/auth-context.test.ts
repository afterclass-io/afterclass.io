import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
vi.mock("./user", () => ({ buildToolContext }));

vi.mock("@/server/mcp/tools", () => ({ allTools: [] }));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: vi.fn().mockResolvedValue({ mcpRateLimitPerMinute: 60 }),
  getRateLimitWindowMinutes: () => 1,
}));

import { makeHandler } from "./register";

describe("tool handler auth resolution", () => {
  beforeEach(() => buildToolContext.mockReset());

  it("builds the tool context from mcpCtx and returns Unauthorized when absent", async () => {
    buildToolContext.mockResolvedValueOnce({ user: { id: "u1" }, caller: {} });
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    await expect(
      handler({}, { auth: { user: { id: "supa-1", email: "a@x.com" } as never } }),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "ok" }] });
    // buildToolContext is now called with the ctx object (which contains auth.user)
    expect(buildToolContext).toHaveBeenCalledWith({ auth: { user: { id: "supa-1", email: "a@x.com" } } });

    buildToolContext.mockResolvedValueOnce(undefined);
    const denied = await handler({}, { auth: { user: { id: "nobody" } as never } });
    expect(denied.isError).toBe(true);
  });

  it("fail-closes when mcpCtx is undefined (no bearer token)", async () => {
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedNoCtx = await handler({}, undefined);
    expect(deniedNoCtx.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith(undefined);

    buildToolContext.mockReset();
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedNoAuth = await handler({}, {});
    expect(deniedNoAuth.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith({});

    buildToolContext.mockReset();
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedEmptyUser = await handler({}, { auth: { user: {} as never } });
    expect(deniedEmptyUser.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith({ auth: { user: {} } });
  });

  it("forwards a Supabase v2 auth.user with id into buildToolContext", async () => {
    buildToolContext.mockResolvedValueOnce({ user: { id: "u1" }, caller: {} });
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    await expect(
      handler(
        {},
        {
          auth: {
            user: {
              id: "supa-1",
              email: "a@x.com",
              amr: [],
            } as never,
          },
        },
      ),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "ok" }] });
    expect(buildToolContext).toHaveBeenCalledWith({ auth: { user: { id: "supa-1", email: "a@x.com", amr: [] } } });
  });

  // legacy userId still works via buildToolContext fallback
  it("legacy userId shape still falls through to buildToolContext", async () => {
    buildToolContext.mockResolvedValueOnce({ user: { id: "u1" }, caller: {} });
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    await expect(
      handler(
        {},
        {
          auth: {
            user: {
              userId: "supa-1",
              email: "a@x.com",
              email_verified: true,
            } as unknown as { userId: string; email: string },
          },
        },
      ),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "ok" }] });
    expect(buildToolContext).toHaveBeenCalledWith({
      auth: { user: { userId: "supa-1", email: "a@x.com", email_verified: true } },
    });
  });

});

/**
 * OAuth wiring tests (Task 4): prove src/mcp/server.ts mounts
 * oauthSupabaseProvider with explicit options in prod and omits it in dev.
 *
 * The server module is a module-scope singleton, so each test re-imports it
 * through a fresh module registry (vi.resetModules + dynamic import) with the
 * desired NODE_ENV. The provider factory itself is mocked — we assert the
 * wiring/options, not Supabase's own token verification (provider surface is
 * covered by mcp-use's own tests; a real verifyToken round-trip needs a live
 * Supabase JWKS).
 */
describe("oauth wiring (Task 4)", () => {
  // Minimal provider stub: the MCPServer constructor only stores config.oauth
  // (no verification/network until listen/fetch), so a plain object suffices.
  const providerStub = { name: "mock-supabase", verifyToken: vi.fn(), getUserInfo: vi.fn() };
  const providerFactory = vi.fn(() => providerStub);

  beforeEach(() => {
    vi.resetModules();
    providerFactory.mockClear();
    // server.ts's OAuth wiring target. Note: register.ts / user.ts only import
    // types from this module, so this runtime mock is safe for ./server.
    vi.doMock("mcp-use/oauth/supabase", () => ({
      oauthSupabaseProvider: providerFactory,
    }));
    // MCPServer itself is not under test here — stub it so no real server is
    // constructed and the import stays side-effect-free.
    vi.doMock("mcp-use", () => ({
      MCPServer: vi.fn(function MockMCPServer(this: Record<string, unknown>, config: unknown) {
        this.config = config;
      }),
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("mcp-use/oauth/supabase");
    vi.doUnmock("mcp-use");
    vi.restoreAllMocks();
  });

  it("mounts oauthSupabaseProvider with projectId when NODE_ENV=production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_PROJECT_ID", "proj-ref");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_URL", "");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_JWT_SECRET", "");

    const { server } = await import("./server");

    expect(providerFactory).toHaveBeenCalledTimes(1);
    expect(providerFactory).toHaveBeenCalledWith(expect.objectContaining({ projectId: "proj-ref" }));
    const calls = providerFactory.mock.calls as unknown as Array<[Record<string, unknown>]>;
    expect(calls[0]![0].supabaseUrl).toBeUndefined();
    expect(calls[0]![0].jwtSecret).toBeUndefined();
    // server.config.oauth carries the provider stub (what middleware consumes)
    expect((server as unknown as { config: { oauth?: unknown } }).config.oauth).toBe(providerStub);
  });

  it("omits oauth entirely when NODE_ENV=development (Inspector zero-auth)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_PROJECT_ID", "proj-ref");

    const { server } = await import("./server");

    expect(providerFactory).not.toHaveBeenCalled();
    expect((server as unknown as { config: { oauth?: unknown } }).config.oauth).toBeUndefined();
  });

  it("throws a clear startup error in production when project config is missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_PROJECT_ID", "");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_URL", "");

    // supabaseOAuth() throws at module scope → the dynamic import rejects.
    await expect(import("./server")).rejects.toThrow(
      /MCP_USE_OAUTH_SUPABASE_PROJECT_ID or MCP_USE_OAUTH_SUPABASE_URL is required/,
    );
    expect(providerFactory).not.toHaveBeenCalled();
  });

  it("passes supabaseUrl and jwtSecret explicitly when set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_PROJECT_ID", "proj-ref");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("MCP_USE_OAUTH_SUPABASE_JWT_SECRET", "x".repeat(40));

    await import("./server");

    expect(providerFactory).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "proj-ref", supabaseUrl: "http://localhost:54321", jwtSecret: "x".repeat(40) }),
    );
  });
});

