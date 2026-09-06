import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (same as register.test.ts / adapters.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("./user", () => ({
  buildToolContext: (...args: unknown[]) =>
    (
      globalThis as {
        __dispatchBuildToolContext?: (...a: unknown[]) => unknown;
      }
    ).__dispatchBuildToolContext?.(...args),
}));

const { checkAndIncrementMock, getChatConfigMock } = vi.hoisted(() => ({
  checkAndIncrementMock: vi.fn() as Mock,
  getChatConfigMock: vi.fn() as Mock,
}));

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: checkAndIncrementMock,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: getChatConfigMock,
  getRateLimitWindowMinutes: () => 1,
}));

import { dispatchToolCall, isDispatchCatalogError } from "./dispatch";

const fakeCtx = {
  user: { id: "u1" } as never,
  caller: {} as never,
};

function okTool(text: string, name = "x") {
  return {
    name,
    readOnly: true,
    run: vi.fn().mockResolvedValue({
      content: [{ type: "text", text }],
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getChatConfigMock.mockResolvedValue({ mcpRateLimitPerMinute: 60 });
  checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  delete (globalThis as Record<string, unknown>).__dispatchBuildToolContext;
});

describe("dispatchToolCall", () => {
  it("returns Unauthorized string when context has no identity", async () => {
    (globalThis as Record<string, unknown>).__dispatchBuildToolContext = vi
      .fn()
      .mockResolvedValue(undefined);
    const tool = { name: "x", readOnly: true, run: vi.fn() };
    const res = await dispatchToolCall({
      tool: tool as never,
      params: {},
      ctx: null,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    expect("error" in res ? res.error : res.content[0]?.text).toMatch(
      /Unauthorized/,
    );
    expect(tool.run).not.toHaveBeenCalled();
  });

  it("checks confirm before budget (destructive + exhausted budget → confirm error, budget untouched)", async () => {
    // Gated tool called without confirm:true while the write bucket is
    // exhausted: the confirm rejection wins and no budget token is consumed.
    checkAndIncrementMock.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 12,
    });
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "should-not-reach" }],
    });
    const res = await dispatchToolCall({
      tool: { name: "set-bid-status", run } as never,
      params: {},
      ctx: fakeCtx,
      policy: { confirm: true, budget: "write", shape: "text" },
    });
    expect("error" in res ? res.error : "").toMatch(/confirm:true/);
    expect(checkAndIncrementMock).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("honors budgetPrefix on the budget key", async () => {
    const tool = okTool("ok", "plain-write-tool");
    const res = await dispatchToolCall({
      tool: tool as never,
      params: {},
      ctx: fakeCtx,
      policy: {
        confirm: false,
        budget: "write",
        shape: "text",
        budgetPrefix: "custom",
      },
    });
    expect(checkAndIncrementMock).toHaveBeenCalledWith("custom:u1", 60, 1);
    expect("error" in res ? res.error : res.content[0]?.text).toBe("ok");
    expect(tool.run).toHaveBeenCalledTimes(1);
  });

  it("truncates oversized text results with the truncation note", async () => {
    const tool = okTool("abcdefghij");
    const res = await dispatchToolCall({
      tool: tool as never,
      params: {},
      ctx: fakeCtx,
      policy: {
        confirm: false,
        budget: "none",
        shape: "text",
        truncateAt: 4,
        truncationNote: "…",
      },
    });
    expect("error" in res ? res.error : res.content[0]?.text).toBe("abcd…");
  });

  it("passes catalog isError text through on the view shape with the catalog-error marker", async () => {
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    });
    const res = await dispatchToolCall({
      tool: { name: "v", run } as never,
      params: {},
      ctx: fakeCtx,
      policy: { confirm: false, budget: "none", shape: "view" },
    });
    if ("error" in res) throw new Error("expected view success envelope");
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("boom");
    expect(isDispatchCatalogError(res.structuredContent)).toBe(true);
  });

  it("throwBehavior propagate rethrows the original error object", async () => {
    const err = new Error("kaboom");
    const run = vi.fn().mockRejectedValue(err);
    await expect(
      dispatchToolCall({
        tool: { name: "v", run } as never,
        params: {},
        ctx: fakeCtx,
        policy: {
          confirm: false,
          budget: "none",
          shape: "text",
          throwBehavior: "propagate",
        },
      }),
    ).rejects.toBe(err);
  });

  it("captures thrown runs as Internal-error envelopes by default", async () => {
    const run = vi.fn().mockRejectedValue(new Error("kaboom"));
    const res = await dispatchToolCall({
      tool: { name: "v", run } as never,
      params: {},
      ctx: fakeCtx,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    expect("error" in res ? res.error : "").toBe("Internal error in tool v");
  });
});
