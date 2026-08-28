import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
vi.mock("./user", () => ({ buildToolContext }));

vi.mock("@/server/mcp/tools", () => ({ allTools: [] }));

import { makeHandler } from "./register";

describe("tool handler auth resolution", () => {
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
});
