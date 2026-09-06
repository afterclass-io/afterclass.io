import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Adapter tests for get-my-timetable-detail — the timetable read surface.
 * Same shared pipeline as the object-shaped adapters in adapters.test.ts:
 *   buildToolContext -> tool.run -> unwrapResultData -> isRawPayload ->
 *   guardedParse(outputSchema) -> {text summary, structuredContent}.
 */

const { buildToolContext } = vi.hoisted(() => ({
  buildToolContext: vi.fn() as Mock,
}));
const { toolRun } = vi.hoisted(() => ({ toolRun: vi.fn() as Mock }));
const { serverTool } = vi.hoisted(() => ({ serverTool: vi.fn() as Mock }));
const { checkAndIncrement } = vi.hoisted(() => ({
  checkAndIncrement: vi.fn() as Mock,
}));

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (established pattern: user.test.ts, register.test.ts, auth-context.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ server: { tool: serverTool } }));
vi.mock("../user", () => ({ buildToolContext }));
vi.mock("@/server/assistant/ratelimit", () => ({ checkAndIncrement }));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: vi.fn().mockResolvedValue({ mcpRateLimitPerMinute: 60 }),
  getRateLimitWindowMinutes: () => 1,
}));
vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    {
      name: "get-my-timetable-detail",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
    },
  ],
}));

// NOTE: a *named* static import of the adapter here breaks capture — the
// oxc/vitest transform hoists the named binding such that the adapter's
// module-scope `server.tool(...)` call runs before the mock registry
// intercepts `../server`, so `serverTool.mock.calls` stays empty (bisected:
// side-effect import works, named import leaves the ToolRef undefined). The
// dynamic import both loads the module (registering it on the mocked server)
// and keeps the registration captured.
await import("./get-my-timetable-detail");

// The adapter registers itself on (mocked) server at import time — pull the
// captured callback out lazily (static import hoisting means the registration
// happened during import, before any top-level statement here runs).
type AdapterResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
};

function registration(name: string): {
  definition: Record<string, unknown>;
  handler: (params: unknown, ctx: unknown) => Promise<AdapterResult>;
} {
  const call = serverTool.mock.calls.find(
    (c) => (c[0] as { name?: string }).name === name,
  );
  if (!call) throw new Error(`no registration captured for ${name}`);
  return {
    definition: call[0] as Record<string, unknown>,
    handler: call[1] as (
      params: unknown,
      ctx: unknown,
    ) => Promise<AdapterResult>,
  };
}

const fakeCtx = { user: { id: "u1" } as never, caller: {} as never };

beforeEach(() => {
  toolRun.mockClear();
  buildToolContext.mockClear();
  buildToolContext.mockResolvedValue(fakeCtx);
  checkAndIncrement.mockClear();
  checkAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
});

/** Fixture valid under timetableDetailOutput (src/mcp/view-tools/schemas.ts). */
const VALID = {
  timetableId: "tt1",
  name: "My Timetable",
  isActive: true,
  termId: "AY202627T1",
  slots: [
    {
      classId: "c1",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      day: "Mon",
      startTime: "08:15",
      endTime: "11:30",
      venue: "SOE/SR3-1",
      professor: "FANG Bingxu",
      creditUnits: 4,
    },
    {
      classId: "c2",
      courseCode: "COR-IS1702",
      courseName: "Computational Thinking",
      section: "G2",
      day: "Tue",
      startTime: "12:00",
      endTime: "15:15",
      venue: null,
      professor: null,
      creditUnits: 4,
    },
  ],
  examTimings: [
    {
      classId: "c1",
      courseCode: "ACCT102",
      section: "G1",
      date: "2026-04-20T00:00:00.000Z",
      dayOfWeek: "Mon",
      startTime: "09:00",
      endTime: "11:00",
      venue: "MPSH 1",
    },
  ],
};

const SUMMARY =
  'Timetable "My Timetable" — 2 classes:\nMon 08:15-11:30: ACCT102 G1 (FANG Bingxu)\nTue 12:00-15:15: COR-IS1702 G2\nOpen timetable: /timetable';

describe("get-my-timetable-detail adapter", () => {
  it("registers with readOnlyHint, a timetable view, and the shared schemas' outputSchema", () => {
    const { definition } = registration("get-my-timetable-detail");
    expect(definition.annotations).toEqual({ readOnlyHint: true });
    expect(definition.view).toMatchObject({
      name: "timetable",
      prefersBorder: true,
    });
    expect(definition.outputSchema).toBeDefined();
  });

  it("happy path — valid catalog JSON becomes typed structuredContent", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(VALID) }],
    });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID);
  });

  it("summary text matches the documented shape", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(VALID) }],
    });
    const res = await handler({}, {});
    expect(res.content[0]?.text).toBe(SUMMARY);
  });

  it("summary appends the timetable page deep-link", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(VALID) }],
    });
    const res = await handler({}, {});
    expect(res.content[0]?.text).toContain("\nOpen timetable: /timetable");
  });

  it("catalog isError propagates as an error result", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "boom" }],
      isError: true,
    });
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("boom");
  });

  it('malformed JSON becomes "Invalid JSON from catalog" (no throw)', async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "{not json" }],
    });
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("Invalid JSON from catalog");
  });

  it("output-schema mismatch becomes clean isError (no throw)", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ totally: "wrong" }) }],
    });
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("Output schema validation failed");
  });

  it("raw payload ({raw}) is rejected, not passed to the view", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ raw: { x: 1 } }) }],
    });
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Invalid .+ payload/);
  });

  it("Unauthorized when buildToolContext resolves nothing", async () => {
    const { handler } = registration("get-my-timetable-detail");
    buildToolContext.mockResolvedValue(undefined);
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unauthorized/);
    expect(toolRun).not.toHaveBeenCalled();
  });

  it("consumes the per-user read budget (mcp-read:) before running", async () => {
    const { handler } = registration("get-my-timetable-detail");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(VALID) }],
    });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(checkAndIncrement).toHaveBeenCalledWith("mcp-read:u1", 60, 1);
    expect(toolRun).toHaveBeenCalledTimes(1);
  });

  it("exhausted read budget returns a friendly error without running", async () => {
    const { handler } = registration("get-my-timetable-detail");
    checkAndIncrement.mockResolvedValueOnce({
      ok: false,
      retryAfterSeconds: 5,
    });
    toolRun.mockClear();
    const res = await handler({}, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/read rate limit/i);
    expect(toolRun).not.toHaveBeenCalled();
  });
});
