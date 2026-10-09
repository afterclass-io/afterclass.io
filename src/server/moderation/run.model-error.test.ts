import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getModel: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@/server/db", () => ({ db: {}, txDb: {} }));
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: vi.fn(),
  peekRateLimit: vi.fn(),
}));
vi.mock("@/server/assistant/providers", () => ({ getModel: m.getModel }));
vi.mock("@/server/config/chat-config", () => ({
  getChatConfigAsync: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: m.captureException }));

import { createModerationJudge } from "./run";

describe("createModerationJudge model resolution failure", () => {
  beforeEach(() => {
    m.getModel.mockReset();
    m.captureException.mockReset();
  });

  it("reports the error to Sentry and still returns the model_unavailable verdict", async () => {
    const failure = new Error("missing LLM_API_KEY");
    m.getModel.mockRejectedValue(failure);

    const result = await createModerationJudge(8000)({
      surfaceLabel: "review",
      text: "text",
    });

    expect(result).toEqual({
      kind: "error",
      reason: "model_unavailable",
      model: "unresolved",
    });
    expect(m.captureException).toHaveBeenCalledTimes(1);
    expect(m.captureException).toHaveBeenCalledWith(
      failure,
      expect.objectContaining({ tags: { area: "moderation.model" } }),
    );
  });
});
