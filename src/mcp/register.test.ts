import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

const { fakeRunA, fakeRunB } = vi.hoisted(() => ({
  fakeRunA: vi.fn() as Mock,
  fakeRunB: vi.fn() as Mock,
}));

const { checkAndIncrementMock, getChatConfigMock } = vi.hoisted(() => ({
  checkAndIncrementMock: vi.fn() as Mock,
  getChatConfigMock: vi.fn() as Mock,
}));

const { buildToolContextMock } = vi.hoisted(() => ({ buildToolContextMock: vi.fn() as Mock }));

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: checkAndIncrementMock,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: getChatConfigMock,
  getRateLimitWindowMinutes: () => 1,
}));

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
vi.mock("server-only", () => ({}));
vi.mock("./user", () => ({
  buildToolContext: buildToolContextMock,
}));
// Single mock for mcp-use — the v2 package has no `mcp-use/server` subpath,
// so there is nothing else to stub.
vi.mock("mcp-use", () => ({
  MCPServer: vi.fn(),
}));

import { registerViewlessTools, viewBoundNames } from "./register";
import { errText, okText } from "@/server/mcp/types";
import { allTools } from "@/server/mcp/tools";

const fakeCtx = {
  user: { id: "u1" } as never,
  caller: {} as never,
};

beforeEach(() => {
  vi.clearAllMocks();
  getChatConfigMock.mockResolvedValue({ mcpRateLimitPerMinute: 60 });
  checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  buildToolContextMock.mockResolvedValue(fakeCtx);
});

describe("registerViewlessTools", () => {
  it("registers every non-view-bound tool with name, description and readOnly annotation", () => {
    const tool = vi.fn();
    const server = { tool } as never;
    registerViewlessTools(server);
    expect(tool).toHaveBeenCalledTimes(2);
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tool-a", description: "A" }),
      expect.any(Function),
    );
    expect(tool).toHaveBeenCalledWith(
      expect.objectContaining({ name: "tool-b", annotations: { readOnlyHint: true } }),
      expect.any(Function),
    );
    // No view/outputSchema for viewless tools
    for (const call of (tool as unknown as Mock).mock.calls) {
      const def = call[0] as Record<string, unknown>;
      expect(def.view).toBeUndefined();
      expect(def.outputSchema).toBeUndefined();
    }
  });

  it("viewBoundNames contains exactly the 7 view-bound tools", () => {
    expect(viewBoundNames).toEqual(
      new Set([
        "search-courses",
        "recommend-bid-amount",
        "get-timetable-calendar-link",
        "my-bid-plan",
        "get-my-roadmap",
        "get-course-reviews",
        "explore-bid-options",
      ]),
    );
    expect(viewBoundNames.size).toBe(7);
  });

  it("skips view-bound tools when they appear in allTools", async () => {
    // Temporarily add a view-bound tool to allTools and ensure it's skipped
    const original = [...(allTools as unknown[])];
    (allTools as unknown as unknown[]).push({
      name: "search-courses",
      description: "Search courses",
      inputSchema: {},
      readOnly: true,
      run: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "should-not-register" }] }),
    });
    const tool = vi.fn();
    registerViewlessTools({ tool } as never);
    // Should still only register the 2 non-view-bound tools, not the injected view-bound one
    expect(tool).toHaveBeenCalledTimes(2);
    expect(tool).not.toHaveBeenCalledWith(expect.objectContaining({ name: "search-courses" }), expect.any(Function));
    // Restore
    (allTools as unknown as unknown[]).length = 0;
    for (const t of original) (allTools as unknown as unknown[]).push(t);
  });

  it("invokes the tool handler and maps its result; never throws", async () => {
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
    registerViewlessTools({ tool } as never);
    const ra = await captured[0]!({});
    expect(ra.content).toMatchObject([{ type: "text", text: "result-a" }]);
    expect(ra.isError).toBeUndefined();
    const rb = await captured[1]!({});
    expect(rb.isError).toBe(true);
    // thrown run errors become the Internal-error envelope (no rethrow)
    expect(rb.content?.[0]?.text).toBe("Internal error in tool tool-b");
  });

  it("rate-limits write tools via DB checkAndIncrement but not readOnly tools", async () => {
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
    registerViewlessTools({ tool } as never);
    expect(captured).toHaveLength(2);

    // write tool (tool-a) hits DB limiter -> blocked, run NOT called
    checkAndIncrementMock.mockClear();
    fakeRunA.mockClear();
    checkAndIncrementMock.mockResolvedValueOnce({ ok: false, retryAfterSeconds: 12 });
    const writeResult = await captured[0]!({}, { auth: { user: { id: "u1", email: "a@b" } } });
    expect(checkAndIncrementMock).toHaveBeenCalledWith("mcp-write:u1", 60, 1);
    expect(fakeRunA).not.toHaveBeenCalled();
    expect(writeResult.isError).toBe(true);
    // blocked result carries the friendly rate-limit message
    expect(writeResult.content?.[0]?.text).toMatch(/rate limit/i);

    // readOnly tool (tool-b) -> no limiter, run proceeds
    checkAndIncrementMock.mockClear();
    fakeRunB.mockClear();
    const readResult = await captured[1]!({}, { auth: { user: { id: "u1", email: "a@b" } } });
    expect(checkAndIncrementMock).not.toHaveBeenCalled();
    expect(fakeRunB).toHaveBeenCalledTimes(1);
    expect(readResult).toMatchObject({ content: [{ type: "text", text: "b-ok" }] });
  });

  it("returns Unauthorized when buildToolContext returns undefined", async () => {
    buildToolContextMock.mockResolvedValue(undefined);
    type CapturedHandler = (args: Record<string, unknown>, mcpCtx?: unknown) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, {});
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toMatch(/Unauthorized/);
    expect(fakeRunA).not.toHaveBeenCalled();
  });

  it("maps tool run isError to error envelope", async () => {
    buildToolContextMock.mockResolvedValue(fakeCtx);
    // reset rate-limit mock that was consumed by earlier test's mockResolvedValueOnce
    checkAndIncrementMock.mockReset();
    checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    fakeRunA.mockResolvedValue(errText("bad input"));
    type CapturedHandler = (args: Record<string, unknown>, mcpCtx?: unknown) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, { auth: { user: { id: "u1" } } });
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toBe("bad input");
  });

  it("viewless tools return raw text envelope (no structuredContent)", async () => {
    buildToolContextMock.mockResolvedValue(fakeCtx);
    fakeRunA.mockResolvedValue(okText(JSON.stringify({ foo: "bar" })));
    type CapturedHandler = (args: Record<string, unknown>, mcpCtx?: unknown) => Promise<{
      isError?: boolean;
      content: Array<{ type: string; text?: string }>;
      structuredContent?: unknown;
      _meta?: unknown;
    }>;
    const captured: CapturedHandler[] = [];
    const tool = vi.fn((_opts: object, handler: CapturedHandler) => {
      captured.push(handler);
    });
    registerViewlessTools({ tool } as never);
    const result = await captured[0]!({}, { auth: { user: { id: "u1" } } });
    expect(result.content?.[0]?.text).toBe(JSON.stringify({ foo: "bar" }));
    expect(result.structuredContent).toBeUndefined();
    expect(result._meta).toBeUndefined();
  });
});
