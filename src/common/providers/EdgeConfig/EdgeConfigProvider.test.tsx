import { describe, expect, it, vi } from "vitest";

const { getEdgeConfigMock } = vi.hoisted(() => ({
  getEdgeConfigMock: vi.fn(),
}));

vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: getEdgeConfigMock,
}));

import { EdgeConfigProvider } from "./EdgeConfigProvider";

describe("EdgeConfigProvider", () => {
  it("passes feature flags to the client but not the server-only chat tunables", async () => {
    getEdgeConfigMock.mockResolvedValue({
      enableReviewSort: true,
      chat: { llmModel: "vendor/model", llmBaseUrl: "https://llm.example" },
    });

    const element = await EdgeConfigProvider({ children: null });
    const passed = (element.props as { edgeConfig: Record<string, unknown> })
      .edgeConfig;

    expect(passed.enableReviewSort).toBe(true);
    expect(passed.chat).toBeUndefined();
  });
});
