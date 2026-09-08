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
      tool: tool,
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
      tool: { name: "set-bid-status", run },
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
      tool: tool,
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
    expect("error" in res ? res.error : res.content[0]?.text).toBe(
      "<tool_output>\nok\n</tool_output>",
    );
    expect(tool.run).toHaveBeenCalledTimes(1);
  });

  it("charges the chat-write bucket with custom limit when policy carries it", async () => {
    // Gated (Tier-1) write with its own policy limit: dispatch charges the
    // chat-write: bucket with the carried limit, not the MCP ceiling.
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    const out = await dispatchToolCall({
      tool: { name: "set-bid-status", run },
      params: { confirm: true },
      ctx: fakeCtx,
      policy: {
        confirm: true,
        budget: "write",
        budgetPrefix: "chat-write",
        limit: 10,
        windowMs: 60_000,
        shape: "text",
      },
    });
    expect("error" in out ? out.error : out.content[0]?.text).toMatch(
      /ok|rate limit/i,
    );
    expect(checkAndIncrementMock).toHaveBeenCalledWith("chat-write:u1", 10, 1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("accepts a valid confirmToken for a Tier-1 tool without confirm:true", async () => {
    const { hashConfirmArgs, mintConfirmToken } = await import(
      "@/server/mcp/confirm-token"
    );
    const args = { timetableId: "tt1" };
    const token = await mintConfirmToken({
      userId: "u1",
      tool: "remove-timetable",
      argHash: hashConfirmArgs(args),
      secret: "test-secret",
    });
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "deleted" }],
    });
    const out = await dispatchToolCall({
      tool: { name: "remove-timetable", run },
      params: { ...args, confirmToken: token },
      ctx: fakeCtx,
      policy: {
        confirm: true,
        budget: "write",
        shape: "text",
        confirmSecret: "test-secret",
      },
    });
    expect("error" in out ? out.error : out.content[0]?.text).toMatch(
      /deleted|rate limit/i,
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects a tampered confirmToken for a Tier-1 tool", async () => {
    const { hashConfirmArgs, mintConfirmToken } = await import(
      "@/server/mcp/confirm-token"
    );
    const args = { timetableId: "tt1" };
    const token = await mintConfirmToken({
      userId: "u1",
      tool: "remove-timetable",
      argHash: hashConfirmArgs(args),
      secret: "test-secret",
    });
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "should-not-reach" }],
    });
    const out = await dispatchToolCall({
      tool: { name: "remove-timetable", run },
      // Tampered args: token binds the original argHash, params carry more.
      params: { ...args, extra: "evil", confirmToken: token },
      ctx: fakeCtx,
      policy: {
        confirm: true,
        budget: "write",
        shape: "text",
        confirmSecret: "test-secret",
      },
    });
    expect("error" in out ? out.error : "").toMatch(/confirm/i);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects an expired confirmToken for a Tier-1 tool", async () => {
    const { hashConfirmArgs, mintConfirmToken } = await import(
      "@/server/mcp/confirm-token"
    );
    const args = { timetableId: "tt1" };
    const token = await mintConfirmToken({
      userId: "u1",
      tool: "remove-timetable",
      argHash: hashConfirmArgs(args),
      secret: "test-secret",
      ttlMs: 1,
    });
    await new Promise((r) => setTimeout(r, 5));
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "should-not-reach" }],
    });
    const out = await dispatchToolCall({
      tool: { name: "remove-timetable", run },
      params: { ...args, confirmToken: token },
      ctx: fakeCtx,
      policy: {
        confirm: true,
        budget: "write",
        shape: "text",
        confirmSecret: "test-secret",
      },
    });
    expect("error" in out ? out.error : "").toMatch(/confirm/i);
    expect(run).not.toHaveBeenCalled();
  });

  it("truncates oversized text results with the truncation note", async () => {
    const tool = okTool("abcdefghij");
    const res = await dispatchToolCall({
      tool: tool,
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
    expect("error" in res ? res.error : res.content[0]?.text).toBe(
      "<tool_output>\nabcd…\n</tool_output>",
    );
  });

  it("passes catalog isError text through on the view shape with the catalog-error marker", async () => {
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    });
    const res = await dispatchToolCall({
      tool: { name: "v", run },
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
        tool: { name: "v", run },
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
      tool: { name: "v", run },
      params: {},
      ctx: fakeCtx,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    expect("error" in res ? res.error : "").toBe("Internal error in tool v");
  });

  it("strips bearer tokens and notes from text-shaped results (central output policy)", async () => {
    // A catalog tool that forgot its own per-row strip must still not leak
    // secrets: dispatch strips the serialized text before shaping.
    const tool = okTool(
      JSON.stringify({
        shareToken: "s",
        icalToken: "i",
        notes: "n",
        code: "C",
      }),
    );
    const res = await dispatchToolCall({
      tool: tool,
      params: {},
      ctx: fakeCtx,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    const text = "error" in res ? res.error : (res.content[0]?.text ?? "");
    expect(text).not.toMatch(/shareToken|icalToken|"notes"/);
    expect(text).toMatch(/"code"/);
  });

  it("strips secrets from isError text too", async () => {
    const run = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: 'failed: "shareToken": "sekret"' }],
      isError: true,
    });
    const res = await dispatchToolCall({
      tool: { name: "v", run },
      params: {},
      ctx: fakeCtx,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    if ("error" in res) throw new Error("expected text success envelope");
    expect(res.content[0]?.text).not.toContain("sekret");
  });

  it("audit-logs successful writes but not reads or failures", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(vi.fn());
    try {
      const writeTool = {
        name: "upsert-bid",
        run: vi
          .fn()
          .mockResolvedValue({ content: [{ type: "text", text: "ok" }] }),
      };
      await dispatchToolCall({
        tool: writeTool,
        params: { classId: "cl1" },
        ctx: fakeCtx,
        policy: { confirm: false, budget: "none", shape: "text" },
      });
      expect(
        log.mock.calls.some((c) =>
          String(c[0]).includes('"tool":"upsert-bid"'),
        ),
      ).toBe(true);

      log.mockClear();
      await dispatchToolCall({
        tool: okTool("read-ok"),
        params: {},
        ctx: fakeCtx,
        policy: { confirm: false, budget: "none", shape: "text" },
      });
      expect(
        log.mock.calls.some((c) => String(c[0]).includes("[audit:write]")),
      ).toBe(false);

      log.mockClear();
      const failingWrite = {
        name: "remove-bid",
        run: vi.fn().mockResolvedValue({
          content: [{ type: "text", text: "no" }],
          isError: true,
        }),
      };
      await dispatchToolCall({
        tool: failingWrite,
        params: {},
        ctx: fakeCtx,
        policy: { confirm: false, budget: "none", shape: "text" },
      });
      expect(
        log.mock.calls.some((c) => String(c[0]).includes("[audit:write]")),
      ).toBe(false);
    } finally {
      log.mockRestore();
    }
  });
});
