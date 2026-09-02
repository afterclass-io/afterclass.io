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

const { widgetMock, textMock, errorMock } = vi.hoisted(() => ({
  widgetMock: vi.fn() as Mock,
  textMock: vi.fn() as Mock,
  errorMock: vi.fn() as Mock,
}));

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
vi.mock("mcp-use/server", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  widget: (...args: unknown[]) => widgetMock(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  text: (...args: unknown[]) => textMock(...args),
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  error: (...args: unknown[]) => errorMock(...args),
}));

import { makeHandler, registerMcpUseTools, toMcpUseResponse } from "./register";
import { errText, okText } from "@/server/mcp/types";

type TextCall = { type: "text"; text: string };
type WidgetCallArgs = { props: Record<string, unknown>; output: unknown };

const fakeCtx = {
  user: { id: "u1" } as never,
  caller: {} as never,
};

beforeEach(() => {
  vi.clearAllMocks();
  getChatConfigMock.mockResolvedValue({ mcpRateLimitPerMinute: 60 });
  checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  buildToolContextMock.mockResolvedValue(fakeCtx);
  // Make mcp-use/server mocks return shapes compatible with toMcpUseResponse expectations.
  textMock.mockImplementation((t: string) => ({ content: [{ type: "text", text: t }] }));
  errorMock.mockImplementation((t: string) => ({ content: [{ type: "text", text: t }], isError: true }));
  widgetMock.mockImplementation((args: WidgetCallArgs) => ({ widget: true, ...args }));
});

describe("toMcpUseResponse", () => {
  it("maps an ok result to a text response", () => {
    const r = toMcpUseResponse(okText("hello"));
    expect(r).toMatchObject({ content: [{ type: "text", text: "hello" }] });
  });
  it("maps an isError result to an error response", () => {
    const r = toMcpUseResponse(errText("boom"));
    expect(r.isError).toBe(true);
    expect(r.content?.[0]).toMatchObject({ type: "text", text: "boom" });
  });
});

describe("registerMcpUseTools", () => {
  it("registers every tool with its name, description and schema", () => {
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

describe("makeHandler widgetProps plumbing", () => {
  it("prefers result.widgetProps over tool.toWidgetProps when both are present", async () => {
    const toWidgetProps = vi.fn((result: { content: TextCall[] }) => ({
      fromLegacy: result.content[0]?.text,
    }));
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "dummy",
      description: "x",
      inputSchema: {} as never,
      readOnly: true,
      widgetName: "calendar-links",
      toWidgetProps,
      run: async () => ({
        content: [{ type: "text", text: "hello" }],
        widgetProps: { feedUrl: "https://x/api/ical/tok" },
      }),
    };
    const handler = makeHandler(
      tool,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (ctx, args) => tool.run(ctx, args as never),
    );
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(toWidgetProps).not.toHaveBeenCalled();
    expect(widgetMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toEqual({ feedUrl: "https://x/api/ical/tok" });
  });

  it("falls back to toWidgetProps when result has no widgetProps (regression guard)", async () => {
    const toWidgetProps = vi.fn((result: { content: TextCall[] }) => ({
      parsed: result.content[0]?.text,
    }));
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "dummy2",
      description: "x",
      inputSchema: {} as never,
      readOnly: true,
      widgetName: "bid-recommendation",
      toWidgetProps,
      run: async () => ({
        content: [{ type: "text", text: '{"a":1}' }],
      }),
    };
    const handler = makeHandler(
      tool,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      (ctx, args) => tool.run(ctx, args as never),
    );
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(toWidgetProps).toHaveBeenCalledTimes(1);
    expect(widgetMock).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toEqual({ parsed: '{"a":1}' });
  });

  it("bid write tool with widgetName yields a widget() with plan props via toWidgetProps", async () => {
    checkAndIncrementMock.mockReset();
    checkAndIncrementMock.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
    widgetMock.mockReset();
    const planPayload = {
      acadTermId: "AY2026/27-T1",
      budget: { balance: 100 },
      bids: [{ id: "b1", bidAmount: 25, courseCode: "ACC101", courseName: "Acct", section: "G1", professorName: null, status: "PLANNED", round: "1", window: 1 }],
    };
    const envelope = JSON.stringify({ updated: { balance: 100 }, plan: planPayload });
    const toWidgetProps = vi.fn((result: { content: TextCall[] }) => {
      const text = result.content.find((c) => c.type === "text")?.text ?? "";
      try {
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && "plan" in parsed) return parsed.plan as Record<string, unknown>;
        return parsed;
      } catch { return { raw: text }; }
    });
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "upsert-bid",
      description: "Create or update bid. Returns the full updated bid plan for the affected term.",
      inputSchema: {} as never,
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- test harness typed assertion
      widgetName: "bid-plan" as unknown as "bid-plan",
      toWidgetProps,
      run: async () => ({ content: [{ type: "text", text: envelope }] }),
    };
    const handler = makeHandler(tool, (ctx, args) => tool.run(ctx, args as never));
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(toWidgetProps).toHaveBeenCalledTimes(1);
    expect(widgetMock).toHaveBeenCalledTimes(1);
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toMatchObject({ acadTermId: "AY2026/27-T1", budget: { balance: 100 } });
  });

  it("roadmap write tool with widgetName yields a widget() with roadmap-view props via toWidgetProps", async () => {
    const roadmapView = JSON.stringify({
      roadmap: { id: "r2", name: "Senior Plan (copy)" },
      entries: [{ course: { code: "CS101", name: "Intro", creditUnits: 1 }, yearNumber: 1, term: "T1" }],
    });
    const toWidgetProps = (result: { content: TextCall[] }) => {
      const text = result.content.find((c) => c.type === "text")?.text ?? "";
      try {
        const data = JSON.parse(text) as Record<string, unknown>;
        const rawEntries = Array.isArray(data.entries) ? (data.entries as unknown[]) : [];
        return { roadmapId: (data.roadmap as Record<string, unknown> | undefined)?.id ?? "", entries: rawEntries };
      } catch { return { raw: text }; }
    };
    const tool: Parameters<typeof makeHandler>[0] = {
      name: "copy-public-roadmap",
      description: "Copy a public roadmap. Returns the updated roadmap.",
      inputSchema: {} as never,
      widgetName: "roadmap-view",
      toWidgetProps,
      run: async () => ({ content: [{ type: "text", text: roadmapView }] }),
    };
    const handler = makeHandler(tool, (ctx, args) => tool.run(ctx, args as never));
    await handler({}, { auth: { user: { userId: "u1" } } });
    expect(widgetMock).toHaveBeenCalledTimes(1);
    const call = widgetMock.mock.calls[0]![0] as WidgetCallArgs;
    expect(call.props).toMatchObject({ roadmapId: "r2" });
  });
});
