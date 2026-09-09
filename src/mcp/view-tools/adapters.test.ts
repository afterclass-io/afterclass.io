import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

/**
 * Happy-path + shared-guard tests for the object-shaped view-tool adapters
 * (my-bid-plan, get-my-roadmap, get-course-reviews, explore-bid-options).
 * They share the same pipeline:
 *   buildToolContext -> tool.run -> unwrapResultData -> isRawPayload ->
 *   guardedParse(outputSchema) -> {text summary, structuredContent}.
 * calendar-links has a different (secret-isolating) shape and is covered in
 * get-timetable-calendar-link.test.ts; search-courses differs in unwrap
 * semantics and is covered in search-courses.test.ts.
 */

const { buildToolContext } = vi.hoisted(() => ({
  buildToolContext: vi.fn() as Mock,
}));
const { toolRun } = vi.hoisted(() => ({ toolRun: vi.fn() as Mock }));
const { serverTool } = vi.hoisted(() => ({ serverTool: vi.fn() as Mock }));
const { checkAndIncrement } = vi.hoisted(() => ({
  checkAndIncrement: vi.fn() as Mock,
}));

// toViewProps used only in the dedicated fallback test — returns the valid
// my-bid-plan payload regardless of result (the real catalog tools build a
// structured payload from result text).
const toViewPropsMock = vi.hoisted(() => ({
  toViewPropsMock: vi.fn() as Mock,
}));

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (established pattern: user.test.ts, register.test.ts, auth-context.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("../server", () => ({ server: { tool: serverTool } }));
vi.mock("../user", () => ({ buildToolContext }));
vi.mock("@/server/assistant/ratelimit", () => ({ checkAndIncrement }));
const { getChatConfigMock } = vi.hoisted(() => ({
  getChatConfigMock: vi.fn() as Mock,
}));
vi.mock("@/server/ecfg/chat", () => ({
  getChatConfig: getChatConfigMock,
  getRateLimitWindowMinutes: () => 1,
}));
vi.mock("@/server/mcp/tools", () => ({
  allTools: [
    {
      name: "my-bid-plan",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
      toViewProps: toViewPropsMock.toViewPropsMock,
    },
    {
      name: "get-my-roadmap",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
    },
    {
      name: "get-course-reviews",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
    },
    {
      name: "explore-bid-options",
      description: "D",
      inputSchema: {},
      readOnly: true,
      run: toolRun,
    },
  ],
}));

// Named imports of the adapters break registration capture (see
// get-timetable-calendar-link.test.ts for the bisected explanation) — use
// dynamic imports.
const { myBidPlan } = await import("./my-bid-plan");
const { getMyRoadmap } = await import("./get-my-roadmap");
const { getCourseReviews } = await import("./get-course-reviews");
const { exploreBidOptions } = await import("./explore-bid-options");

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
  getChatConfigMock.mockReset();
  getChatConfigMock.mockResolvedValue({
    mcpRateLimitPerMinute: 60,
    mcpEnabled: true,
  });
});

/** Fixtures valid under each outputSchema (src/mcp/view-tools/schemas.ts). */
const VALID = {
  "my-bid-plan": {
    acadTermId: "AY202627T1",
    budget: { balance: 100 },
    bids: [
      {
        id: "b1",
        bidAmount: 10,
        status: "SECURED",
        courseCode: "ACCT102",
        courseName: "Management Accounting",
        section: "G1",
        professorName: "FANG Bingxu",
        round: "1",
        window: 1,
      },
      {
        id: "b2",
        bidAmount: 25,
        status: "PENDING",
        courseCode: "COR-IS1702",
        courseName: "Computational Thinking",
        section: "G2",
        professorName: null,
        round: "1",
        window: 2,
      },
    ],
  },
  "get-my-roadmap": {
    roadmapId: "r1",
    name: "My Plan",
    isPublic: false,
    owner: null,
    voteCount: null,
    entries: [
      {
        yearNumber: 1,
        term: "T1",
        courseCode: "ACCT102",
        courseName: "Management Accounting",
        creditUnits: 3,
      },
      {
        yearNumber: 1,
        term: "T1",
        courseCode: "COR-IS1702",
        courseName: "Computational Thinking",
        creditUnits: 3,
      },
      {
        yearNumber: 1,
        term: "T2",
        courseCode: "STAT203",
        courseName: "Financial Mathematics",
        creditUnits: 3,
      },
    ],
  },
  "get-course-reviews": {
    context: "ACCT102",
    reviews: [
      {
        id: "rv1",
        body: "Great professor, workload is heavy but fair",
        tips: "Study past papers",
        rating: 5,
        labels: ["hard", "useful"],
        voteCount: 3,
        createdAt: "2026-01-01",
        courseCode: "ACCT102",
        professorName: "FANG Bingxu",
      },
      {
        id: "rv2",
        body: null,
        tips: "Read before class",
        rating: 4,
        labels: [],
        voteCount: 1,
        createdAt: "2026-02-01",
        courseCode: "ACCT102",
        professorName: null,
      },
    ],
  },
  "explore-bid-options": {
    classId: "cl1",
    history: [
      {
        acadTermId: "AY202526T1",
        round: "1",
        window: 1,
        min: 14,
        median: 22,
        vacancy: 10,
      },
      {
        acadTermId: "AY202526T1",
        round: "1",
        window: 2,
        min: 16,
        median: 26,
        vacancy: null,
      },
    ],
    prediction: {
      medianPredicted: 24,
      minPredicted: 15,
      bidWindow: { id: 1, round: "1", window: 1 },
    },
    safetyFactors: [
      { beatsPercentage: 60, multiplier: 0.25 },
      { beatsPercentage: 80, multiplier: 0.88 },
      { beatsPercentage: 95, multiplier: 1.81 },
    ],
  },
} as Record<string, Record<string, unknown>>;

const ADAPTERS: Array<[string, unknown, string]> = [
  [
    "my-bid-plan",
    myBidPlan,
    "Bid plan for AY202627T1 — balance 100, 2 bids:\nACCT102 G1 (FANG Bingxu): 10 — SECURED R1W1\nCOR-IS1702 G2: 25 — PENDING R1W2\nManage bids: /timetable",
  ],
  [
    "get-my-roadmap",
    getMyRoadmap,
    'Roadmap "My Plan" — 3 entries:\nY1 T1: ACCT102, COR-IS1702\nY1 T2: STAT203\nOpen roadmap: /roadmaps?view=mine',
  ],
  [
    "get-course-reviews",
    getCourseReviews,
    "Reviews for ACCT102 — 2 reviews:\n★5 [hard, useful] FANG Bingxu — Great professor, workload is heavy but fair\n★4 — Read before class\nFull reviews: /course/ACCT102",
  ],
  [
    "explore-bid-options",
    exploreBidOptions,
    "Bid options for class cl1 — 2 history rows:\nAY202526T1 R1W1: min 14, median 22, vacancy 10\nAY202526T1 R1W2: min 16, median 26\nPrediction: median 24 (min 15) for round 1 window 1\nOpen in bid analytics: /bidding/analytics?classId=cl1",
  ],
];

/** Expected appended deep-link line per adapter (default params `{}`). */
const LINKS: Record<string, string> = {
  "my-bid-plan": "Manage bids: /timetable",
  "get-my-roadmap": "Open roadmap: /roadmaps?view=mine",
  "get-course-reviews": "Full reviews: /course/ACCT102",
  "explore-bid-options":
    "Open in bid analytics: /bidding/analytics?classId=cl1",
};

describe("object-shaped view-tool adapters", () => {
  for (const [name] of ADAPTERS) {
    it(`${name}: registers with derived title/annotations, a view, and the shared schemas' outputSchema`, () => {
      const { definition } = registration(name);
      const title = name
        .split("-")
        .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1) : w))
        .join(" ");
      expect(definition.title).toBe(title);
      expect(definition.annotations).toEqual({
        title,
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      });
      expect(definition.view).toMatchObject({ prefersBorder: true });
      expect(definition.outputSchema).toBeDefined();
    });

    it(`${name}: happy path — valid catalog JSON becomes typed structuredContent`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(VALID[name]!) }],
      });
      const res = await handler({}, {});
      expect(res.isError).toBeUndefined();
      expect(res.structuredContent).toEqual(VALID[name]!);
    });

    it(`${name}: summary text matches the documented shape`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(VALID[name]!) }],
      });
      const res = await handler({}, {});
      expect(res.content[0]?.text).toBe(ADAPTERS.find(([n]) => n === name)![2]);
    });

    it(`${name}: summary appends the page deep-link line`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(VALID[name]!) }],
      });
      const res = await handler({}, {});
      expect(res.content[0]?.text).toContain(`\n${LINKS[name]}`);
    });

    it(`${name}: catalog isError propagates as an error result`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: "boom" }],
        isError: true,
      });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("boom");
    });

    it(`${name}: malformed JSON becomes "Invalid JSON from catalog" (no throw)`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: "{not json" }],
      });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("Invalid JSON from catalog");
    });

    it(`${name}: output-schema mismatch becomes clean isError (no throw)`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({ totally: "wrong" }) }],
      });
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toBe("Output schema validation failed");
    });

    it(`${name}: raw payload ({raw}) is rejected, not passed to the view`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify({ raw: { x: 1 } }) }],
      });
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

    it(`${name}: consumes the per-user read budget (mcp-read:) before running`, async () => {
      const { handler } = registration(name);
      toolRun.mockResolvedValue({
        content: [{ type: "text", text: JSON.stringify(VALID[name]!) }],
      });
      const res = await handler({}, {});
      expect(res.isError).toBeUndefined();
      expect(checkAndIncrement).toHaveBeenCalledWith("mcp-read:u1", 60, 1);
      expect(toolRun).toHaveBeenCalledTimes(1);
    });

    it(`${name}: exhausted read budget returns a friendly error without running`, async () => {
      const { handler } = registration(name);
      checkAndIncrement.mockResolvedValueOnce({
        ok: false,
        retryAfterSeconds: 7,
      });
      toolRun.mockClear();
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toMatch(/read rate limit/i);
      expect(toolRun).not.toHaveBeenCalled();
    });

    // Task 4 kill-switch: mcpEnabled=false refuses the view-tool before
    // auth/budget/run (tool never runs, budget never charged).
    it(`${name}: refuses with a disabled error when mcpEnabled is false`, async () => {
      const { handler } = registration(name);
      getChatConfigMock.mockResolvedValue({
        mcpRateLimitPerMinute: 60,
        mcpEnabled: false,
      });
      checkAndIncrement.mockClear();
      toolRun.mockClear();
      const res = await handler({}, {});
      expect(res.isError).toBe(true);
      expect(res.content[0]?.text).toMatch(/disabled/i);
      expect(toolRun).not.toHaveBeenCalled();
      expect(checkAndIncrement).not.toHaveBeenCalled();
    });
  }
});

describe("deep-link line details", () => {
  it("explore-bid-options: prefers input courseCode+section over resolved classId", async () => {
    const { handler } = registration("explore-bid-options");
    toolRun.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(VALID["explore-bid-options"]!) },
      ],
    });
    const res = await handler({ courseCode: "COR-IS1702", section: "G1" }, {});
    expect(res.content[0]?.text).toContain(
      "\nOpen in bid analytics: /bidding/analytics?course=COR-IS1702&section=G1",
    );
  });

  it("explore-bid-options: omits the link line when no link inputs resolve", async () => {
    const { handler } = registration("explore-bid-options");
    toolRun.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            ...VALID["explore-bid-options"],
            classId: null,
          }),
        },
      ],
    });
    const res = await handler({}, {});
    expect(res.content[0]?.text).not.toContain("Open in bid analytics:");
  });
});

describe("viewProps unwrap path (my-bid-plan via toViewProps fallback)", () => {
  it("prefers result.viewProps over content JSON", async () => {
    const { handler } = registration("my-bid-plan");
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "{}" }],
      viewProps: VALID["my-bid-plan"],
    });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["my-bid-plan"]);
  });

  it("falls back to tool.toViewProps when viewProps is absent", async () => {
    const { handler } = registration("my-bid-plan");
    toViewPropsMock.toViewPropsMock.mockReturnValue(VALID["my-bid-plan"]);
    toolRun.mockResolvedValue({
      content: [{ type: "text", text: "not-json-shape-but-unused" }],
    });
    const res = await handler({}, {});
    expect(toViewPropsMock.toViewPropsMock).toHaveBeenCalled();
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["my-bid-plan"]);
  });

  it("falls back to content-text JSON when neither viewProps nor toViewProps yields data", async () => {
    const { handler } = registration("get-my-roadmap");
    toolRun.mockResolvedValue({
      content: [
        { type: "text", text: JSON.stringify(VALID["get-my-roadmap"]) },
      ],
    });
    const res = await handler({}, {});
    expect(res.isError).toBeUndefined();
    expect(res.structuredContent).toEqual(VALID["get-my-roadmap"]);
  });
});

describe("shared view-tool plumbing (Task 11)", () => {
  it("throws a NAMED error when the catalog tool is missing", async () => {
    const { allTools } = await import("@/server/mcp/tools");
    const t = allTools.find((x) => x.name === "does-not-exist");
    expect(t).toBeUndefined();
    expect(() => {
      if (!t) throw new Error("[mcp] catalog tool missing: does-not-exist");
    }).toThrow(/does-not-exist/);
  });

  it("catalogToolOrThrow names the missing tool", async () => {
    const { catalogToolOrThrow } = await import("./make-view-tool");
    expect(() => catalogToolOrThrow("does-not-exist")).toThrow(
      /\[mcp\] catalog tool missing: does-not-exist/,
    );
  });

  it("pageByCursor pages deterministically", async () => {
    const { pageByCursor } = await import("../output-policy");
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(pageByCursor(items, (x) => x.id, undefined, 2)).toEqual({
      items: [{ id: "a" }, { id: "b" }],
      nextCursor: "b",
    });
    expect(pageByCursor(items, (x) => x.id, "b", 2)).toEqual({
      items: [{ id: "c" }],
      nextCursor: null,
    });
    // Unknown cursor restarts from the first page.
    expect(pageByCursor(items, (x) => x.id, "zzz", 2)).toEqual({
      items: [{ id: "a" }, { id: "b" }],
      nextCursor: "b",
    });
  });
});
