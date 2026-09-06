import { describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (same as register.test.ts / adapters.test.ts).
vi.mock("server-only", () => ({}));
vi.mock("./user", () => ({
  buildToolContext: (...args: unknown[]) =>
    (
      globalThis as {
        __dispatchBuildToolContext?: (...a: unknown[]) => unknown;
      }
    ).__dispatchBuildToolContext?.(...args),
}));

import { dispatchToolCall } from "./dispatch";
describe("dispatchToolCall", () => {
  it("returns Unauthorized string when context has no identity", async () => {
    (globalThis as Record<string, unknown>).__dispatchBuildToolContext = vi
      .fn()
      .mockResolvedValue(undefined);
    const tool = { name: "x", readOnly: true, run: vi.fn() };
    const res = await dispatchToolCall({
      tool: tool as never,
      params: {},
      ctx: null,
      policy: { confirm: false, budget: "none", shape: "text" },
    });
    expect("error" in res ? res.error : res.content[0]?.text).toMatch(
      /Unauthorized/,
    );
    expect(tool.run).not.toHaveBeenCalled();
    delete (globalThis as Record<string, unknown>).__dispatchBuildToolContext;
  });
});
