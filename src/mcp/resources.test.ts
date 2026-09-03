import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

vi.mock("mcp-use", () => ({
  MCPServer: class MockServer { resource = vi.fn(); tool = vi.fn(); prompt = vi.fn(); },
}));

import { registerResources } from "./resources";

type CapturedHandler = (
  uri: URL,
  ctx: unknown,
) => Promise<{ contents: Array<{ uri: string; mimeType: string; text: string }> }>;

describe("registerResources", () => {
  it("registers the acad-terms resource with the catalog uri", () => {
    const resource = vi.fn();
    const server = { resource } as never;
    registerResources(server);

    expect(resource).toHaveBeenCalledTimes(1);
    const [definition, handler] = resource.mock.calls[0] as [
      { name?: string; uri?: string; description?: string; mimeType?: string },
      unknown,
    ];
    expect(definition.name).toBe("Academic terms");
    expect(definition.uri).toBe("catalog://acad-terms");
    expect(definition.mimeType).toBe("application/json");
    expect(handler).toBeInstanceOf(Function);
  });

  it("returns live academic terms from the caller, matching the list-acad-terms shape", async () => {
    const list = vi.fn().mockResolvedValue([
      { id: "t1", label: "AY2026/27 T1", startDt: new Date("2026-08-01"), endDt: new Date("2026-11-30") },
      { id: "t2", label: "AY2026/27 T2", startDt: new Date("2027-01-01"), endDt: new Date("2027-04-30") },
    ]) as Mock;
    const caller = { acadTerms: { list } };

    const resource = vi.fn();
    registerResources({ resource } as never, caller);
    const [, handler] = resource.mock.calls[0] as [unknown, CapturedHandler];

    const result = await (handler)(new URL("catalog://acad-terms"), {});
    expect(list).toHaveBeenCalledTimes(1);

    expect(result.contents).toHaveLength(1);
    expect(result.contents[0]!.mimeType).toBe("application/json");
    expect(result.contents[0]!.uri).toBe("catalog://acad-terms");
    const body = JSON.parse(result.contents[0]?.text ?? "{}") as {
      terms: Array<{ id: string; label: string }>;
    };
    expect(body.terms.length).toBeGreaterThan(0);
    expect(body.terms[0]).toMatchObject({ id: "t1", label: "AY2026/27 T1" });
  });

  it("returns an empty terms array when the caller has no terms", async () => {
    const list = vi.fn().mockResolvedValue([]) as Mock;
    const resource = vi.fn();
    registerResources({ resource } as never, { acadTerms: { list } });
    const [, handler] = resource.mock.calls[0] as [unknown, CapturedHandler];

    const result = await (handler)(new URL("catalog://acad-terms"), {});
    expect(JSON.parse(result.contents[0]?.text ?? "{}")).toEqual({ terms: [] });
  });

  it("returns an empty terms array (not a throw) when the caller fails", async () => {
    const list = vi.fn().mockRejectedValue(new Error("incrementalCache missing")) as Mock;
    const resource = vi.fn();
    registerResources({ resource } as never, { acadTerms: { list } });
    const [, handler] = resource.mock.calls[0] as [unknown, CapturedHandler];

    const result = await (handler)(new URL("catalog://acad-terms"), {});
    expect(JSON.parse(result.contents[0]?.text ?? "{}")).toEqual({ terms: [] });
  });
});