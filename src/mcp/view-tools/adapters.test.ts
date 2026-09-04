import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Happy-path + shared-guard tests for the object-shaped view-tool adapters
 * (my-bid-plan, get-my-roadmap, get-course-reviews, explore-bid-options,
 * recommend-bid-amount). They share the same pipeline:
 *   buildToolContext -> tool.run -> unwrapResultData -> isRawPayload ->
 *   guardedParse(outputSchema) -> {text summary, structuredContent}.
 * calendar-links has a different (secret-isolating) shape and is covered in
 * get-timetable-calendar-link.test.ts; search-courses differs in unwrap
 * semantics and is covered in search-courses.test.ts.
 */

const { buildToolContext } = vi.hoisted(() => ({ buildToolContext: vi.fn() as Mock }));
const { toolRun } = vi.hoisted(() => ({ toolRun: vi.fn() as Mock }));
const { serverTool } = vi.hoisted(() => ({ serverTool: vi.fn() as Mock }));

// toWidgetProps used only in the dedicated fallback test — returns the valid
// my-bid-plan payload regardless of result (the real catalog tools build a
// structured payload from result text).
const toWidgetPropsMock = vi.hoisted(() => ({ toWidgetPropsMock: vi.fn() as Mock }));

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (established pattern: user.test.ts, register.test.ts, auth-context.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ server: { tool: serverTool } }));
vi.mock("../user", () => ({ buildToolContext }));
vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    { name: "my-bid-plan", description: "D", inputSchema: {}, readOnly: true, run: toolRun, toWidgetProps: toWidgetPropsMock.toWidgetPropsMock },
    { name: "get-my-roadmap", description: "D", inputSchema: {}, readOnly: true, run: toolRun },
    { name: "get-course-reviews", description: "D", inputSchema: {}, readOnly: true, run: toolRun },
    { name: "explore-bid-options", description: "D", inputSchema: {}, readOnly: true, run: toolRun },
    { name: "recommend-bid-amount", description: "D", inputSchema: {}, readOnly: true, run: toolRun },
  ],
}));

// Named imports of the adapters break registration capture (see
// get-timetable-calendar-link.test.ts for the bisected explanation) — use
// dynamic imports.
const { myBidPlan } = await import("./my-bid-plan");
const { getMyRoadmap } = await import("./get-my-roadmap");
const { getCourseReviews } = await import("./get-course-reviews");
const { exploreBidOptions } = await import("./explore-bid-options");
const { recommendBidAmount } = await import("./recommend-bid-amount");

type AdapterResult = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
};

function registration(name: string): { definition: Record<string, unknown>; handler: (params: unknown, ctx: unknown) => Promise<AdapterResult> } {
  const call = serverTool.mock.calls.find((c) => (c[0] as { name?: string }).name === name);
  if (!call) throw new Error(`no registration captured for ${name}`);
  return { definition: call[0] as Record<string, unknown>, handler: call[1] as (params: unknown, ctx: unknown) => Promise<AdapterResult> };
}

const fakeCtx = { user: { id: "u1" } as never, caller: {} as never };

beforeEach(() => {
  toolRun.mockClear();
  buildToolContext.mockClear();
  buildToolContext.mockResolvedValue(fakeCtx);
});

/** Fixtures valid under each outputSchema (src/mcp/view-tools/schemas.ts). */
const VALID = {
  "my-bid-plan": {
    acadTermId: "2026-1",
    budget: { balance: 100 },
    bids: [
      {
        id: "b1", bidAmount: 10, status: "SECURED", courseCode: "ACC101",
        courseName: "Financial Accounting", section: "G1", professorName: "Jane Doe",
        round: "1", window: 1,
      },
      {
        id: "b2", bidAmount: 25, status: "PENDING", courseCode: "COR-IS1702",
        courseName: "Computational Thinking", section: "G2", professorName: null,
        round: "1", window: 2,
      },
    ],
  },
  "get-my-roadmap": {
    roadmapId: "r1", name: "My Plan", isPublic: false, owner: "me", voteCount: 0,
    entries: [
      { yearNumber: 1, term: "T1", courseCode: "ACC101", courseName: "Financial Accounting", creditUnits: 3 },
      { yearNumber: 1, term: "T1", courseCode: "COR-IS1702", courseName: "Computational Thinking", creditUnits: 3 },
      { yearNumber: 1, term: "T2", courseCode: "COR-STAT1202", courseName: "Statistics", creditUnits: 3 },
    ],
  },
  "get-course-reviews": {
    context: "ACC101",
    reviews: [
      {
        id: "rv1", body: "Great professor, workload is heavy but fair", tips: "Study past papers",
        rating: 5, labels: ["hard", "useful"],
        voteCount: 3, createdAt: "2026-01-01", courseCode: "ACC101", professorName: "Jane Doe",
      },
      {
        id: "rv2", body: null, tips: "Read before class", rating: 4, labels: [],
        voteCount: 1, createdAt: "2026-02-01", courseCode: "ACC101", professorName: null,
      },
    ],
  },
  "explore-bid-options": {
    classId: "cl1",
    history: [
      { acadTermId: "2025-2", round: "1", window: 1, min: 1, median: 5, vacancy: 10 },
      { acadTermId: "2025-2", round: "1", window: 2, min: 2, median: 7, vacancy: null },
    ],
    prediction: { medianPredicted: 6, minPredicted: 2, bidWindow: { id: 1, round: "1", window: 1 } },
    safetyFactors: [{ beatsPercentage: 80, multiplier: 1.5 }],
  },
  "recommend-bid-amount": {
    classId: "cl1", acadTermId: "2026-1", predictedMedian: 5, suggestedBidAmount: 8,
    bidWindow: { id: 1, round: "1", window: 1 },
    multiplierUsed: { beatsPercentage: 80, multiplier: 1.5 },
  },
} as Record<string, Record<string, unknown>>;

const ADAPTERS: Array<[string, unknown, string]> = [
  ["my-bid-plan", myBidPlan, "Bid plan for 2026-1 — balance 100, 2 bids:\nACC101 G1 (Jane Doe): 10 — SECURED R1W1\nCOR-IS1702 G2: 25 — PENDING R1W2"],
  ["get-my-roadmap", getMyRoadmap, 'Roadmap "My Plan" — 3 entries:\nY1 T1: ACC101, COR-IS1702\nY1 T2: COR-STAT1202'],
  ["get-course-reviews", getCourseReviews, "Reviews for ACC101 — 2 reviews:\n★5 [hard, useful] Jane Doe — Great professor, workload is heavy but fair\n★4 — Read before class"],
  ["explore-bid-options", exploreBidOptions, "Bid options for class cl1 — 2 history rows:\n2025-2 R1W1: min 1, median 5, vacancy 10\n2025-2 R1W2: min 2, median 7\nPrediction: median 6 (min 2) for round 1 window 1"],
  ["recommend-bid-amount", recommendBidAmount, "Suggested bid 8 for class cl1 (predicted median 5, 2026-1 R1W1)"],
];

describe("object-shaped view-tool adapters", () => {
  for (const [name] of ADAPTERS) {
    it(`${name}: registers with readOnlyHint, a view, and the shared schemas' outputSchema`, () => {
      const { definition } = registration(name);
      expect(definition.annotations).toEqual({ readOnlyHint: true });
      expect(definition.view).toMatchObject({ prefersBorder: true });
      expect(definition.outputSchema).toBeDefined();
    });

    it(`${name}: happy path — valid catalog JSON becomes typed structuredContent`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(VALID[name]!) }] });
      const res = await handler({}, {});
      expect(res.isError).toBeUndefined();
      expect(res.structuredContent).toEqual(VALID[name]!);
    });

    it(`${name}: summary text matches the documented shape`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(VALID[name]!) }] });
      const res = await handler({}, {});
      expect(res.content[0]?.text).toBe(ADAPTERS.find(([n]) => n === name)![2]);
    });

    it(`${name}: catalog isError propagates as an error result`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: "boom" }], isError: true });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("boom");
    });

    it(`${name}: malformed JSON becomes "Invalid JSON from catalog" (no throw)`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: "{not json" }] });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("Invalid JSON from catalog");
    });

    it(`${name}: output-schema mismatch becomes clean isError (no throw)`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ totally: "wrong" }) }] });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("Output schema validation failed");
    });

    it(`${name}: raw payload ({raw}) is rejected, not passed to the view`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify({ raw: { x: 1 } }) }] });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toMatch(/Invalid .+ payload/);
    });

    it(`${name}: Unauthorized when buildToolContext resolves nothing`, async () => {
      const { handler } = registration(name);
      buildToolContext.mockResolvedValue(undefined);
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toMatch(/Unauthorized/);
      expect(toolRun).not.toHaveBeenCalled();
    });
  }
});

describe("recommend-bid-amount fallback summary", () => {
  it("summary includes the suggested amount, predicted median, and window", async () => {
    const { handler } = registration("recommend-bid-amount");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ classId: "cl1", acadTermId: "2026-1", predictedMedian: 5, suggestedBidAmount: 8 }) }],
    });
    const res = await handler({}, {});
    expect(res.content[0]?.text).toBe("Suggested bid 8 for class cl1 (predicted median 5, 2026-1)");
  });

  it("schema-invalid payload (non-numeric suggestedBidAmount) is rejected before the summary is built", async () => {
    const { handler } = registration("recommend-bid-amount");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ classId: "cl1", acadTermId: "2026-1", predictedMedian: 5, suggestedBidAmount: "8" }) }],
    });
    const res = await handler({}, {});
    // The schema requires a numeric suggestedBidAmount, and guardedParse runs
    // before the summary — a payload missing it errors out first.
    expect(res.isError).toBe(true);
    expect(res.content[0]?.text).toBe("Output schema validation failed");
  });
});

describe("widgetProps unwrap path (my-bid-plan via toWidgetProps fallback)", () => {
  it("prefers result.widgetProps over content JSON", async () => {
    const { handler } = registration("my-bid-plan");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "{}" }],
      widgetProps: VALID["my-bid-plan"],
    });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["my-bid-plan"]);
  });

  it("falls back to tool.toWidgetProps when widgetProps is absent", async () => {
    const { handler } = registration("my-bid-plan");
    toWidgetPropsMock.toWidgetPropsMock.mockReturnValue(VALID["my-bid-plan"]);
    toolRun.mockResolvedValue({ content: [{ type: "text", text: "not-json-shape-but-unused" }] });
    const res = await handler({}, {});
    expect(toWidgetPropsMock.toWidgetPropsMock).toHaveBeenCalled();
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["my-bid-plan"]);
  });

  it("falls back to content-text JSON when neither widgetProps nor toWidgetProps yields data", async () => {
    const { handler } = registration("get-my-roadmap");
    toolRun.mockResolvedValue({ content: [{ type: "text", text: JSON.stringify(VALID["get-my-roadmap"]) }] });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["get-my-roadmap"]);
  });
});
