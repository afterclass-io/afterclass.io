import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Adapter-level tests for get-timetable-calendar-link — the secret-isolation
 * boundary. The catalog tool's widgetProps carry bearer-bearing iCal URLs that
 * must NEVER reach structuredContent or model-visible text; they may only ride
 * in `_meta` (the View-only channel). This mirrors the View's poison test at
 * the adapter level.
 */

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
const { toolRun } = vi.hoisted(() => ({ toolRun: vi.fn() as Mock }));
const { serverTool } = vi.hoisted(() => ({ serverTool: vi.fn() as Mock }));
const { checkAndIncrement } = vi.hoisted(() => ({ checkAndIncrement: vi.fn() as Mock }));

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (established pattern: user.test.ts, register.test.ts, auth-context.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ server: { tool: serverTool } }));
vi.mock("../user", () => ({ buildToolContext }));
vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    { name: "get-timetable-calendar-link", description: "D", inputSchema: {}, readOnly: false, run: toolRun },
  ],
}));
vi.mock("@/server/assistant/ratelimit", () => ({ checkAndIncrement }));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: vi.fn().mockResolvedValue({ mcpRateLimitPerMinute: 60 }),
  getRateLimitWindowMinutes: () => 1,
}));

// NOTE: a *named* static import of the adapter here breaks capture — the
// oxc/vitest transform hoists the named binding such that the adapter's
// module-scope `server.tool(...)` call runs before the mock registry
// intercepts `../server`, so `serverTool.mock.calls` stays empty (bisected:
// side-effect import works, named import leaves the ToolRef undefined). The
// dynamic import both loads the module (registering it on the mocked server)
// and keeps the registration captured.
await import("./get-timetable-calendar-link");

// The adapter registers itself on (mocked) server at import time — pull the
// captured callback out lazily (static import hoisting means the registration
// happened during import, before any top-level statement here runs).
type AdapterResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  _meta?: Record<string, unknown>;
};

function captured(): { definition: { name: string; view?: { name: string } }; handler: (params: unknown, ctx: unknown) => Promise<AdapterResult> } {
  const call = serverTool.mock.calls.at(-1);
  if (!call) throw new Error("adapter did not register on server.tool");
  return {
    definition: call[0] as { name: string; view?: { name: string } },
    handler: call[1] as (params: unknown, ctx: unknown) => Promise<AdapterResult>,
  };
}

const fakeCtx = { user: { id: "u1" } as never, caller: {} as never };

const SECRET_URLS = {
  feedUrl: "https://secret-host.test/f/tok123.ics",
  subscribeUrl: "https://secret-host.test/webcal/tok123",
  googleSubscribeUrl: "https://calendar.google.com/render?cid=tok123",
  appleSubscribeUrl: "webcal://secret-host.test/a/tok123",
  outlookSubscribeUrl: "https://outlook.office.com/owa/calendar/tok123",
};

beforeEach(() => {
  // Clear behavior mocks but NOT serverTool — its mock.calls hold the module-
  // scope adapter registration captured() reads.
  toolRun.mockClear();
  buildToolContext.mockClear();
  checkAndIncrement.mockClear();
  buildToolContext.mockResolvedValue(fakeCtx);
  checkAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
});

describe("get-timetable-calendar-link adapter", () => {
  it("binds the calendar-links view", () => {
    expect(captured().definition.name).toBe("get-timetable-calendar-link");
    expect(captured().definition.view?.name).toBe("calendar-links");
  });

  it("keeps secret URLs out of structuredContent and text; _meta carries them", async () => {
    const catalogText =
      "Calendar subscribe links are shown in the widget. The feed stays in sync automatically when the timetable changes.";
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: catalogText }],
      widgetProps: { timetableId: "tt1", madeLinkShareable: false, ...SECRET_URLS },
    });
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBeUndefined();

    // Poison assertions: structuredContent carries ZERO URL-shaped data.
    const scJson = JSON.stringify(res.structuredContent);
    expect(res.structuredContent).toEqual({ timetableId: "tt1", madeLinkShareable: false });
    expect(scJson).not.toContain("http");
    expect(scJson).not.toContain("webcal");
    expect(scJson).not.toContain("tok123");

    // Model-visible text is the catalog text — which itself must be URL-free
    // (catalog contract) and must not grow URLs anywhere in the adapter.
    expect(res.content[0]?.text).toBe(catalogText);
    expect(res.content[0]?.text).not.toContain("http");

    // The View-only channel carries the secrets.
    expect(res._meta).toEqual(SECRET_URLS);
  });

  it("returns an error result when the catalog tool fails", async () => {
    toolRun.mockResolvedValue({ content: [{ type: "text", text: "boom" }], isError: true });
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("boom");
  });

  it("errors when no timetableId comes back in widgetProps", async () => {
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      widgetProps: { feedUrl: "https://x.test/f.ics" },
    });
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Missing timetableId/);
  });

  it("falls back to tool.toWidgetProps when result.widgetProps is absent", async () => {
    const props = { timetableId: "tt9", ...SECRET_URLS };
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    // Re-import with the catalog tool exposing toWidgetProps: patch via allTools entry
    const { allTools } = (await import("@/server/mcp/tools")) as {
      allTools: Array<{ toWidgetProps?: (r: unknown) => unknown }>;
    };
    (allTools[0] as { toWidgetProps?: (r: unknown) => unknown }).toWidgetProps = () => props;
    const res = await captured().handler({ timetableId: "tt9" }, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual({ timetableId: "tt9" });
    expect(res._meta).toEqual(SECRET_URLS);
  });

  it("omits _meta entirely when every URL is empty", async () => {
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      widgetProps: { timetableId: "tt1", feedUrl: "", subscribeUrl: "", googleSubscribeUrl: "", appleSubscribeUrl: "", outlookSubscribeUrl: "" },
    });
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBeUndefined();
    expect(res._meta).toBeUndefined();
  });

  it("only includes madeLinkShareable when it is a boolean", async () => {
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      widgetProps: { timetableId: "tt1", madeLinkShareable: true, feedUrl: "https://x.test/f.ics" },
    });
    const withFlag = await captured().handler({ timetableId: "tt1" }, {});
    expect(withFlag.structuredContent).toEqual({ timetableId: "tt1", madeLinkShareable: true });

    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
      widgetProps: { timetableId: "tt1", madeLinkShareable: "yes", feedUrl: "https://x.test/f.ics" },
    });
    const withoutFlag = await captured().handler({ timetableId: "tt1" }, {});
    expect(withoutFlag.structuredContent).toEqual({ timetableId: "tt1" });
  });

  it("returns Unauthorized when buildToolContext resolves nothing", async () => {
    buildToolContext.mockResolvedValue(undefined);
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unauthorized/);
    expect(toolRun).not.toHaveBeenCalled();
  });

  it("honours the write budget before running the tool", async () => {
    checkAndIncrement.mockResolvedValue({ ok: false, retryAfterSeconds: 12 });
    const res = await captured().handler({ timetableId: "tt1" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Write rate limit exceeded/);
    expect(toolRun).not.toHaveBeenCalled();
  });
});
