import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Adapter tests for search-courses. Unlike the object-shaped adapters it does
 * NOT use tool.toWidgetProps (that would mask JSON parse errors as
 * {results:[]}): it unwraps the raw catalog array itself, masks a non-array
 * success payload to [] (documented in the adapter), and validates against
 * courseSearchOutput.
 */

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
const { toolRun } = vi.hoisted(() => ({ toolRun: vi.fn() as Mock }));
const { serverTool } = vi.hoisted(() => ({ serverTool: vi.fn() as Mock }));

vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ server: { tool: serverTool } }));
vi.mock("../user", () => ({ buildToolContext }));
vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    // toWidgetProps deliberately present: the adapter must NOT use it
    // (it preserves Invalid JSON semantics instead of masking to {results:[]}).
    {
      name: "search-courses",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
      toWidgetProps: () => ({ results: [{ code: "MASKED", name: "MASKED" }] }),
    },
  ],
}));

// Named static imports of the adapters break registration capture (see
// get-timetable-calendar-link.test.ts for the bisected explanation) — the
// dynamic import loads the module AND keeps the registration captured.
await import("./search-courses");

type AdapterResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: { results?: unknown[] };
};

function registration(name: string): { definition: Record<string, unknown>; handler: (params: unknown, ctx: unknown) => Promise<AdapterResult> } {
  const call = serverTool.mock.calls.find((c) => (c[0] as { name?: string }).name === name);
  if (!call) throw new Error(`no registration captured for ${name}`);
  return { definition: call[0] as Record<string, unknown>, handler: call[1] as (params: unknown, ctx: unknown) => Promise<AdapterResult> };
}

const fakeCtx = { user: { id: "u1" } as never, caller: {} as never };

const COURSE = {
  id: "c1",
  code: "ACC101",
  name: "Financial Accounting",
  creditUnits: 3,
  sections: [
    {
      classId: "cl1",
      section: "G1",
      professorName: null,
      timings: [{ dayOfWeek: "Mon", startTime: "08:00", endTime: "11:00", venue: "SOE" }],
      examTimings: [{ date: "2026-12-01", startTime: "13:00", endTime: "15:00", venue: null }],
    },
  ],
};

beforeEach(() => {
  toolRun.mockClear();
  buildToolContext.mockClear();
  buildToolContext.mockResolvedValue(fakeCtx);
});

describe("search-courses adapter", () => {
  it("registers with readOnlyHint, the course-search view, and courseSearchOutput", () => {
    const { definition } = registration("search-courses");
    expect(definition.annotations).toEqual({ readOnlyHint: true });
    expect(definition.view).toMatchObject({ name: "course-search", prefersBorder: true });
    expect(definition.outputSchema).toBeDefined();
  });

  it("happy path — catalog array becomes {results} structuredContent, summary carries codes", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify([COURSE]) }] });
    const res = await handler({ query: "acc" }, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual({ results: [COURSE] });
    expect(res.content[0]?.text).toBe("Found 1 courses:\nACC101 | Financial Accounting | 1 sections");
  });

  it("summary lists every hit as code | name | N sections (Task 7 chaining format)", async () => {
    const { handler } = registration("search-courses");
    const second = { ...COURSE, id: "c2", code: "COR-IS1702", name: "Computational Thinking", sections: [{}, {}, {}, {}, {}] };
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify([COURSE, second]) }] });
    const res = await handler({ query: "comp" }, {});
    expect(res.isError).toBeUndefined();
    expect(res.content[0]?.text).toBe(
      "Found 2 courses:\nACC101 | Financial Accounting | 1 sections\nCOR-IS1702 | Computational Thinking | 5 sections",
    );
  });

  it("masks a non-array success payload to {results: []} (documented masking)", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ oops: true }) }] });
    const res = await handler({ query: "acc" }, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual({ results: [] });
    expect(res.content[0]?.text).toBe("Found 0 courses");
  });

  it("empty results keep the bare count summary (no trailing lines)", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify([]) }] });
    const res = await handler({ query: "zzz-no-match" }, {});
    expect(res.isError).toBeUndefined();
    expect(res.content[0]?.text).toBe("Found 0 courses");
  });

  it("malformed JSON stays an error — toWidgetProps masking is NOT used", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: "{not json" }] });
    const res = await handler({ query: "acc" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("Invalid JSON from catalog");
    // If the adapter had (wrongly) used toWidgetProps, this would have been a
    // success result with {results:[{code:"MASKED"}]} instead.
  });

  it("catalog isError propagates as an error result", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: "boom" }], isError: true });
    const res = await handler({ query: "acc" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("boom");
  });

  it("Unauthorized when buildToolContext resolves nothing", async () => {
    const { handler } = registration("search-courses");
    buildToolContext.mockResolvedValue(undefined);
    const res = await handler({ query: "acc" }, {});
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toMatch(/Unauthorized/);
    expect(toolRun).not.toHaveBeenCalled();
  });

  it("runs the catalog tool once with the caller params", async () => {
    const { handler } = registration("search-courses");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify([]) }] });
    await handler({ query: "acc" }, {});
    expect(toolRun).toHaveBeenCalledTimes(1);
    expect(toolRun).toHaveBeenCalledWith(fakeCtx, { query: "acc" });
  });
});
