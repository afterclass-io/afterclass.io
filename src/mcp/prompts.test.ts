import { describe, expect, it, vi } from "vitest";

vi.mock("mcp-use", () => ({
  MCPServer: class MockServer { resource = vi.fn(); tool = vi.fn(); prompt = vi.fn(); },
}));

import { registerPrompts } from "./prompts";

type CapturedPromptHandler = (args: { targetTermId?: string; facultyId?: number }) => Promise<{
  messages: Array<{ role: string; content: { type: string; text: string } }>;
}>;

describe("registerPrompts", () => {
  it("registers the plan-semester prompt with its name, description and a schema", async () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);

    expect(prompt).toHaveBeenCalledTimes(1);
    const [definition, handler] = prompt.mock.calls[0] as [
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
    const [, handler] = prompt.mock.calls[0] as [unknown, CapturedPromptHandler];

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
    const [definition] = prompt.mock.calls[0] as [
      { schema?: { shape?: Record<string, { description?: string }> } },
      unknown,
    ];
    // The describe() string was dropped in Task 1 — ensure it's restored.
    expect(definition.schema?.shape?.targetTermId?.description).toMatch(/list-acad-terms/);
  });
});