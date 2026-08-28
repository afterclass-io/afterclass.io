import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// Stub the heavy mcp-use module (response helpers only) so we can register the
// resource against a fake `{ resource }` server and invoke the captured handler
// with a mock caller - same pattern as `prompts.test.ts`. `zod` is not involved
// here, and the caller is injected, so no server stack is pulled in.
vi.mock("mcp-use/server", () => ({
  object: (value: unknown) => ({ content: [{ type: "text", text: JSON.stringify(value) }] }),
}));

import { registerResources } from "./resources";

type CapturedHandler = () => Promise<{ content: Array<{ type: string; text?: string }> }>;

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
    expect(handler).toBeInstanceOf(Function);
  });

  it("returns live academic terms from the caller, matching the list-acad-terms shape", async () => {
    const list = vi.fn().mockResolvedValue([
      { id: "t1", label: "AY2026/27 T1", startDt: new Date("2026-08-01"), endDt: new Date("2026-11-30") },
      { id: "t2", label: "AY2026/27 T2", startDt: new Date("2027-01-01"), endDt: new Date("2027-04-30") },
    ]) as Mock;
    const caller = { acadTerms: { list } };

    const resource = vi.fn();
    registerResources({ resource } as never, caller as never);
    const [, handler] = resource.mock.calls[0] as [unknown, CapturedHandler];

    const result = await handler();
    expect(list).toHaveBeenCalledTimes(1);

    const body = JSON.parse(result.content[0]?.text ?? "{}") as {
      terms: Array<{ id: string; label: string }>;
    };
    // The resource must resolve live data - dead `terms: []` fails this.
    expect(body.terms.length).toBeGreaterThan(0);
    // Inner shape matches what `list-acad-terms` returns ({ id, label, ... }).
    expect(body.terms[0]).toMatchObject({ id: "t1", label: "AY2026/27 T1" });
  });

  it("returns an empty terms array when the caller has no terms", async () => {
    const list = vi.fn().mockResolvedValue([]) as Mock;
    const resource = vi.fn();
    registerResources({ resource } as never, { acadTerms: { list } } as never);
    const [, handler] = resource.mock.calls[0] as [unknown, CapturedHandler];

    const result = await handler();
    expect(JSON.parse(result.content[0]?.text ?? "{}")).toEqual({ terms: [] });
  });
});
