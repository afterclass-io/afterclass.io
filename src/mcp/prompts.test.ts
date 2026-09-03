import { describe, expect, it, vi } from "vitest";

vi.mock("mcp-use", () => ({
  MCPServer: class MockServer { resource = vi.fn(); tool = vi.fn(); prompt = vi.fn(); },
}));

import { registerPrompts } from "./prompts";

type CapturedPromptHandler = (args: Record<string, unknown>) => Promise<{
  messages: Array<{ role: string; content: { type: string; text: string } }>;
}>;

const EXPECTED_PROMPTS = [
  "plan-semester",
  "plan-roadmap",
  "check-graduation",
  "plan-bidding",
  "find-courses",
  "review-timetable",
] as const;

function registrations(prompt: ReturnType<typeof vi.fn>): Map<string, CapturedPromptHandler> {
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

    expect(prompt).toHaveBeenCalledTimes(EXPECTED_PROMPTS.length);
    const names = (prompt.mock.calls as Array<[{ name?: string }]>).map((c) => c[0]?.name);
    expect(names).toEqual([...EXPECTED_PROMPTS]);
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

    const call = (prompt.mock.calls as Array<
      [{ name?: string; description?: string; schema?: { shape?: Record<string, unknown> } }, unknown]
    >).find((c) => c[0]?.name === "plan-semester")!;
    const [definition, handler] = call as [
      { name?: string; description?: string; schema?: { shape?: Record<string, unknown> } },
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
    expect(withoutArgs.messages[0]!.content.text).toContain("plan-semester tool to get the target term");
    expect(withoutArgs.messages[0]!.content.text).toContain("Do not invent course codes");
  });

  it("keeps schema describe text for targetTermId", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const call = (prompt.mock.calls as Array<
      [{ name?: string; schema?: { shape?: Record<string, { description?: string }> } }, unknown]
    >).find((c) => c[0]?.name === "plan-semester")!;
    const [definition] = call;
    // The describe() string was dropped in Task 1 — ensure it's restored.
    expect(definition.schema?.shape?.targetTermId?.description).toMatch(/list-acad-terms/);
  });

  it("each user-goal prompt grounds its workflow in real tools (no invented codes)", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);
    const handlers = registrations(prompt);

    const roadmap = await handlers.get("plan-roadmap")!({ goal: "double major in Finance and Marketing" });
    expect(roadmap.messages[0]!.content.text).toContain("double major in Finance and Marketing");
    expect(roadmap.messages[0]!.content.text).toContain("check-roadmap-feasibility");
    expect(roadmap.messages[0]!.content.text).toContain("Do not invent course codes");

    const graduation = await handlers.get("check-graduation")!({});
    expect(graduation.messages[0]!.content.text).toContain("check-roadmap-feasibility");
    expect(graduation.messages[0]!.content.text).toContain("Do not invent course codes");

    const bidding = await handlers.get("plan-bidding")!({});
    expect(bidding.messages[0]!.content.text).toContain("my-bid-plan");
    expect(bidding.messages[0]!.content.text).toContain("get-bid-prediction");

    const courses = await handlers.get("find-courses")!({ interest: "machine learning" });
    expect(courses.messages[0]!.content.text).toContain("machine learning");
    expect(courses.messages[0]!.content.text).toContain("search-courses");
    expect(courses.messages[0]!.content.text).toContain("Do not invent course codes");

    const timetable = await handlers.get("review-timetable")!({});
    expect(timetable.messages[0]!.content.text).toContain("my-timetables");
    expect(timetable.messages[0]!.content.text).toContain("exam clash");
  });
});