import { describe, expect, it, vi } from "vitest";

// Stub the heavy mcp-use module (response helpers only) so we can register the
// prompt/resource definitions against a fake `{ prompt, resource }` server and
// assert the names/uris the brief specifies. `zod` is left real - the schema
// passed to `server.prompt` must be a real ZodObject.
vi.mock("mcp-use/server", () => ({
  text: (text: string) => ({ content: [{ type: "text", text }] }),
  object: (value: unknown) => ({ content: [{ type: "text", text: JSON.stringify(value) }] }),
}));

import { registerPrompts } from "./prompts";
import { registerResources } from "./resources";

describe("registerPrompts", () => {
  it("registers the plan-semester prompt with its name, description and a schema", () => {
    const prompt = vi.fn();
    const server = { prompt } as never;
    registerPrompts(server);

    expect(prompt).toHaveBeenCalledTimes(1);
    const [definition, handler] = prompt.mock.calls[0] as [
      { name?: string; description?: string; schema?: { shape?: Record<string, unknown> } },
      unknown,
    ];
    expect(definition.name).toBe("plan-semester");
    expect(definition.description).toContain("what should I take next term");
    expect(definition.schema).toBeDefined();
    // A zod v3 ZodObject exposes `shape` with the declared keys.
    expect(Object.keys(definition.schema?.shape ?? {})).toEqual(
      expect.arrayContaining(["targetTermId", "facultyId"]),
    );
    expect(handler).toBeInstanceOf(Function);
  });
});

describe("registerResources", () => {
  it("registers the acad-terms resource with the catalog uri", () => {
    const resource = vi.fn();
    const server = { resource } as never;
    registerResources(server);

    expect(resource).toHaveBeenCalledTimes(1);
    const [definition, handler] = resource.mock.calls[0] as [
      { name?: string; uri?: string; description?: string },
      unknown,
    ];
    expect(definition.name).toBe("Academic terms");
    expect(definition.uri).toBe("catalog://acad-terms");
    expect(definition.description).toContain("plan-semester");
    expect(handler).toBeInstanceOf(Function);
  });
});
