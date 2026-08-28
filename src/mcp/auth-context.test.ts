import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
vi.mock("./user", () => ({ buildToolContext }));

vi.mock("@/server/mcp/tools", () => ({ allTools: [] }));

import { makeHandler } from "./register";

describe("tool handler auth resolution", () => {
  beforeEach(() => buildToolContext.mockReset());

  it("builds the tool context from ctx.auth and returns Unauthorized when absent", async () => {
    buildToolContext.mockResolvedValueOnce({ user: { id: "u1" }, caller: {} });
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    await expect(
      handler({}, { auth: { user: { userId: "supa-1", email: "a@x.com" } } }),
    ).resolves.toMatchObject({ content: [{ type: "text", text: "ok" }] });
    expect(buildToolContext).toHaveBeenCalledWith({ userId: "supa-1", email: "a@x.com" });

    buildToolContext.mockResolvedValueOnce(undefined);
    const denied = await handler({}, { auth: { user: { userId: "nobody" } } });
    expect(denied.isError).toBe(true);
  });

  it("fail-closes when ctx.auth is undefined (no bearer token)", async () => {
    const handler = makeHandler({} as never, async () => ({ content: [{ type: "text", text: "ok" }] }));
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedNoCtx = await handler({}, undefined);
    expect(deniedNoCtx.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith({});

    buildToolContext.mockReset();
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedNoAuth = await handler({}, {});
    expect(deniedNoAuth.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith({});

    buildToolContext.mockReset();
    buildToolContext.mockResolvedValueOnce(undefined);
    const deniedEmptyUser = await handler({}, { auth: { user: {} } });
    expect(deniedEmptyUser.isError).toBe(true);
    expect(buildToolContext).toHaveBeenCalledWith({});
  });

  it("forwards a present auth.user into buildToolContext (verified-email shape)", async () => {
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
    expect(buildToolContext).toHaveBeenCalledWith({ userId: "supa-1", email: "a@x.com", email_verified: true });
  });

  it("src/mcp/index.ts wires oauthSupabaseProvider()", async () => {
    const serverMod = await import("mcp-use/server");
    expect(typeof (serverMod as { oauthSupabaseProvider?: unknown }).oauthSupabaseProvider).toBe("function");
    const provider = (serverMod as { oauthSupabaseProvider: () => unknown }).oauthSupabaseProvider();
    expect(provider).toBeTruthy();
    expect(typeof (provider as { verifyToken?: unknown }).verifyToken).toBe("function");
    expect(typeof (provider as { getUserInfo?: unknown }).getUserInfo).toBe("function");
  });
});
