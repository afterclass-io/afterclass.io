import { describe, expect, it, vi } from "vitest";

vi.mock("mcp-use", () => ({
  MCPServer: class MockServer {
    resource = vi.fn();
    tool = vi.fn();
    prompt = vi.fn();
  },
}));

import { registerPrompts } from "./prompts";

type CapturedPromptHandler = (args: Record<string, unknown>) => Promise<{
  messages: Array<{ role: string; content: { type: string; text: string } }>;
}>;

const EXPECTED_PROMPTS = [
  "plan-semester",
  "plan-roadmap",
  "plan-bidding",
  "find-courses",
  "review-timetable",
  "plan-term",
] as const;

function registrations(
  prompt: ReturnType<typeof vi.fn>,
): Map<string, CapturedPromptHandler> {
  const map = new Map<string, CapturedPromptHandler>();
  for (const [definition, handler] of prompt.mock.calls as Array<
    [{ name?: string }, CapturedPromptHandler]
  >) {
    if (definition.name) map.set(definition.name, handler);
  }
  return map;
}

describe("registerPrompts", () => {
  it("registers all 6 user-goal prompts with name, description and schema", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);

    expect(prompt).toHaveBeenCalledTimes(6);
    const names = (prompt.mock.calls as Array<[{ name?: string }]>).map(
      (c) => c[0]?.name,
    );
    expect(names).toEqual([...EXPECTED_PROMPTS]);
    expect(names).not.toContain("check-graduation");
    for (const [definition, handler] of prompt.mock.calls as Array<
      [{ description?: string; schema?: unknown }, unknown]
    >) {
      expect(definition.description).toBeTruthy();
      expect(definition.schema).toBeDefined();
      expect(handler).toBeInstanceOf(Function);
    }
  });

  it("registers the plan-semester prompt with its name, description and a schema", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);

    const call = (
      prompt.mock.calls as Array<
        [
          {
            name?: string;
            description?: string;
            schema?: { shape?: Record<string, unknown> };
          },
          unknown,
        ]
      >
    ).find((c) => c[0]?.name === "plan-semester")!;
    const [definition, handler] = call as [
      {
        name?: string;
        description?: string;
        schema?: { shape?: Record<string, unknown> };
      },
      CapturedPromptHandler,
    ];
    expect(definition.name).toBe("plan-semester");
    expect(definition.description).toContain("what should I take next term");
    expect(definition.schema).toBeDefined();
    expect(Object.keys(definition.schema?.shape ?? {})).toEqual(
      expect.arrayContaining(["targetTermId", "facultyId"]),
    );
    expect(handler).toBeInstanceOf(Function);
  });

  it("returns raw GetPromptResult messages with interpolated args", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-semester")!;

    const withArgs = await handler({ targetTermId: "T1", facultyId: 42 });
    expect(withArgs.messages).toHaveLength(1);
    expect(withArgs.messages[0]!.role).toBe("user");
    expect(withArgs.messages[0]!.content.type).toBe("text");
    expect(withArgs.messages[0]!.content.text).toContain('targetTermId "T1"');
    expect(withArgs.messages[0]!.content.text).toContain("facultyId 42");

    const withoutArgs = await handler({});
    expect(withoutArgs.messages[0]!.content.text).not.toContain("targetTermId");
    expect(withoutArgs.messages[0]!.content.text).toContain(
      "plan-semester tool to get the target term",
    );
    expect(withoutArgs.messages[0]!.content.text).toContain(
      "Do not invent course codes",
    );
  });

  it("keeps schema describe text for targetTermId", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const call = (
      prompt.mock.calls as Array<
        [
          {
            name?: string;
            schema?: { shape?: Record<string, { description?: string }> };
          },
          unknown,
        ]
      >
    ).find((c) => c[0]?.name === "plan-semester")!;
    const [definition] = call;
    // The describe() string must carry the list-acad-terms pointer.
    expect(definition.schema?.shape?.targetTermId?.description).toMatch(
      /list-acad-terms/,
    );
  });

  it("plan-semester prompt accepts faculty acronyms and points at list-faculties", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-semester")!;

    const withAcronym = await handler({ facultyId: "SCIS" });
    expect(withAcronym.messages[0]!.content.text).toContain('facultyId "SCIS"');
    expect(withAcronym.messages[0]!.content.text).toContain("list-faculties");
  });

  it("plan-semester prompt forwards goal and documents the catalog fallback", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const call = (
      prompt.mock.calls as Array<
        [
          { name?: string; schema?: { shape?: Record<string, unknown> } },
          unknown,
        ]
      >
    ).find((c) => c[0]?.name === "plan-semester")!;
    expect(Object.keys(call[0]?.schema?.shape ?? {})).toEqual(
      expect.arrayContaining(["goal"]),
    );

    const handler = registrations(prompt).get("plan-semester")!;
    const withGoal = await handler({ goal: "data engineering" });
    expect(withGoal.messages[0]!.content.text).toContain("data engineering");
    expect(withGoal.messages[0]!.content.text).toContain("fallback-catalog");
  });

  it("plan-semester prompt calls list-faculties once and caches the id", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-semester")!;

    const result = await handler({});
    const text = result.messages[0]!.content.text;
    expect(text).toMatch(/list-faculties once/i);
    // "once" must be literal: no second list-faculties call anywhere.
    expect(text.match(/list-faculties/g)).toHaveLength(1);
  });

  it("find-courses prompt points at list-faculties for faculty-scoped searches", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("find-courses")!;

    const result = await handler({ interest: "machine learning" });
    expect(result.messages[0]!.content.text).toContain("list-faculties");
  });

  it("each user-goal prompt grounds its workflow in real tools (no invented codes)", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handlers = registrations(prompt);

    const roadmap = await handlers.get("plan-roadmap")!({
      goal: "double major in Finance and Marketing",
    });
    expect(roadmap.messages[0]!.content.text).toContain(
      "double major in Finance and Marketing",
    );
    expect(roadmap.messages[0]!.content.text).toContain(
      "check-roadmap-feasibility",
    );
    expect(roadmap.messages[0]!.content.text).toContain(
      "Do not invent course codes",
    );

    const bidding = await handlers.get("plan-bidding")!({});
    expect(bidding.messages[0]!.content.text).toContain("my-bid-plan");
    expect(bidding.messages[0]!.content.text).toContain("explore-bid-options");

    const courses = await handlers.get("find-courses")!({
      interest: "machine learning",
    });
    expect(courses.messages[0]!.content.text).toContain("machine learning");
    expect(courses.messages[0]!.content.text).toContain("search-courses");
    expect(courses.messages[0]!.content.text).toContain(
      "Do not invent course codes",
    );

    const timetable = await handlers.get("review-timetable")!({});
    expect(timetable.messages[0]!.content.text).toContain("my-timetables");
    expect(timetable.messages[0]!.content.text).toContain("exam clash");
  });

  it("user-goal prompts steer the model to render tool-provided page links", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handlers = registrations(prompt);

    // plan-bidding no longer hardcodes page links (exact Journey Gaps body):
    // the 'Manage bids: /timetable' link arrives via the my-bid-plan summary.
    const bidding = await handlers.get("plan-bidding")!({});
    expect(bidding.messages[0]!.content.text).toContain("set-bid-budget");
    const courses = await handlers.get("find-courses")!({
      interest: "machine learning",
    });
    expect(courses.messages[0]!.content.text).toContain("/course/");

    const semester = await handlers.get("plan-semester")!({});
    expect(semester.messages[0]!.content.text).toContain("/course/");
    const timetable = await handlers.get("review-timetable")!({});
    expect(timetable.messages[0]!.content.text).toContain("/timetable");
  });

  it("plan-semester prompt states the senior-first fallback order", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-semester")!;

    const result = await handler({});
    expect(result.messages[0]!.content.text).toContain(
      "same-faculty senior candidates first",
    );
    expect(result.messages[0]!.content.text).toContain("fallback-catalog");
  });

  it("plan-bidding prompt tells the model to offer set-bid-budget when budget is null", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-bidding")!;

    const result = await handler({});
    const text = result.messages[0]!.content.text;
    expect(text).toContain("set-bid-budget");
    expect(text).toMatch(/budget.*null|no budget set/i);
  });

  it("plan-semester prompt resolves intake year to a matric term and defaults faculty from get-me", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-semester")!;

    const result = await handler({});
    const text = result.messages[0]!.content.text;
    expect(text).toContain("intake year");
    expect(text).toContain("set-matric-term");
    expect(text).toContain("get-me");
  });

  it("find-courses prompt maps common names to codes via search", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("find-courses")!;

    const result = await handler({ interest: "statistics" });
    expect(result.messages[0]!.content.text).toContain("COR-STAT1202");
  });

  it("registers the plan-term journey prompt", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const names = (prompt.mock.calls as Array<[{ name?: string }]>).map(
      (c) => c[0]?.name,
    );
    expect(names).toContain("plan-term");
  });

  it("plan-term prompt encodes the 1-4 journey with real tools", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-term")!;
    const result = await handler({ goal: "data engineering" });
    const text = result.messages[0]!.content.text;
    for (const tool of [
      "search-courses",
      "get-course-reviews",
      "explore-bid-options",
      "my-bid-plan",
      "set-bid-budget",
      "get-timetable-calendar-link",
    ]) {
      expect(text).toContain(tool);
    }
    expect(text).toContain("Do not invent course codes");
  });

  it("plan-roadmap prompt treats public roadmaps as hints to verify", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handler = registrations(prompt).get("plan-roadmap")!;

    const result = await handler({ goal: "become a data analyst" });
    expect(result.messages[0]!.content.text).toContain("hints, not truth");
    expect(result.messages[0]!.content.text).toContain(
      "check-roadmap-feasibility",
    );
  });
});
