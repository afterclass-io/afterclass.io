import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { fakeRunA, fakeRunB } = vi.hoisted(() => ({
  fakeRunA: vi.fn() as Mock,
  fakeRunB: vi.fn() as Mock,
}));

// register.ts holds ONE module-scoped write rate limiter shared by all write
// tools (created once at import time). To keep tests isolated we replace the
// factory with one that returns a controllable limiter; beforeEach resets it
// so no test inherits another test's consumed write budget.
const { createWriteRateLimiterMock, writeRateLimiterMock } = vi.hoisted(() => {
  const writeRateLimiterMock = {
    check: vi.fn(() => ({ ok: true, remaining: 10, retryAfterMs: 0 })),
    reset: vi.fn(),
  };
  return {
    writeRateLimiterMock,
    createWriteRateLimiterMock: vi.fn(() => writeRateLimiterMock),
  };
});

// Keep the real withWriteRateLimit wrapping logic; only swap the limiter
// factory so the instance is reachable and resettable from the test.
vi.mock("@/server/mcp/rate-limit", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/server/mcp/rate-limit")>();
  return { ...mod, createWriteRateLimiter: createWriteRateLimiterMock };
});

vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    { name: "tool-a", description: "A", inputSchema: {}, run: fakeRunA },
    { name: "tool-b", description: "B", inputSchema: {}, readOnly: true, run: fakeRunB },
  ],
}));
vi.mock("@/server/mcp/types", () => ({
  okText: (text: string) => ({ content: [{ type: "text", text }] }),
  errText: (text: string) => ({ content: [{ type: "text", text }], isError: true }),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : String(e)),
}));
// register.ts now imports ./user → @/server/mcp/caller → server-only chain.
vi.mock("server-only", () => ({}));
const { buildToolContextMock } = vi.hoisted(() => ({ buildToolContextMock: vi.fn() as Mock }));
vi.mock("./user", () => ({
  buildToolContext: buildToolContextMock,
}));

import { registerMcpUseTools, toMcpUseResponse } from "./register";
import { errText, okText } from "@/server/mcp/types";

describe("toMcpUseResponse", () => {
  it("maps an ok result to a text response", () => {
    const r = toMcpUseResponse(okText("hello"));
    // mcp-use v1.34 text() also adds _meta: { mimeType: "text/plain" }, so
    // assert on content rather than exact shape.
    expect(r).toMatchObject({ content: [{ type: "text", text: "hello" }] });
  });
  it("maps an isError result to an error response", () => {
    const r = toMcpUseResponse(errText("boom"));
    expect(r.isError).toBe(true);
    expect(r.content?.[0]).toMatchObject({ type: "text", text: "boom" });
  });
});

describe("registerMcpUseTools", () => {
  const ctx = { user: "u" as never, caller: {} as never };

  beforeEach(() => {
    // Isolation: the limiter is module-scoped in register.ts, so clear its
    // state before every test (fresh bucket, no cross-test leakage).
    writeRateLimiterMock.check.mockClear();
    writeRateLimiterMock.reset.mockClear();
  });

  it("registers every tool with its name, description and schema", () => {
    buildToolContextMock.mockResolvedValue(ctx);
    const tool = vi.fn();
    const server = { tool } as never;
    registerMcpUseTools(server);
    expect(tool).toHaveBeenCalledTimes(2);
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tool-a", description: "A" }),
      expect.any(Function),
    );
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tool-b", annotations: { readOnlyHint: true } }),
      expect.any(Function),
    );
  });

  it("invokes the tool handler and maps its result; never throws", async () => {
    buildToolContextMock.mockResolvedValue(ctx);
    fakeRunA.mockResolvedValue(okText("result-a"));
    fakeRunB.mockRejectedValue(new Error("boom-b"));
    type CapturedHandler = (args: Record<string, unknown>, mcpCtx?: unknown) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerMcpUseTools({ tool } as never);
    await expect(captured[0]!({})).resolves.toMatchObject({ content: [{ type: "text", text: "result-a" }] });
    const rb = await captured[1]!({});
    expect(rb.isError).toBe(true);
  });

  it("rate-limits write tools via DB checkAndIncrement but not readOnly tools", async () => {
    buildToolContextMock.mockResolvedValue(ctx);
    checkAndIncrementMock.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 12 });
    fakeRunA.mockResolvedValue(okText("should-not-reach"));
    fakeRunB.mockResolvedValue(okText("b-ok"));

    type CapturedHandler = (args: Record<string, unknown>, mcpCtx?: unknown) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerMcpUseTools({ tool } as never);
    expect(captured).toHaveLength(2);

    // write tool (tool-a) hits DB limiter -> blocked, run NOT called
    checkAndIncrementMock.mockClear();
    fakeRunA.mockClear();
    checkAndIncrementMock.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 12 });
    const writeResult = await captured[0]!({}, { auth: { user: { userId: "u1" } } });
    expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-write:u1", 60, 1);
    expect(fakeRunA).not.toHaveBeenCalled();
    expect(writeResult.isError).toBe(true);

    // readOnly tool (tool-b) -> no limiter, run proceeds
    checkAndIncrementMock.mockClear();
    fakeRunB.mockClear();
    const readResult = await captured[1]!({}, { auth: { user: { userId: "u1" } } });
    expect(checkAndIncrementMock).not.toHaveBeenCalled();
    expect(fakeRunB).toHaveBeenCalledTimes(1);
    expect(readResult).toMatchObject({ content: [{ type: "text", text: "b-ok" }] });
  });
});
