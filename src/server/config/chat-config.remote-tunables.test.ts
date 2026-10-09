import { beforeEach, describe, expect, it, vi } from "vitest";

import fallbackConfig from "@/server/ecfg/config.json";

const { getAllMock } = vi.hoisted(() => ({ getAllMock: vi.fn() }));

vi.mock("@vercel/edge-config", () => ({ getAll: getAllMock }));

import { chatTunablesSchema } from "@/server/ecfg/config";
import { DEFAULT_CHAT_CONFIG_VALUES, getChatConfigAsync } from "./chat-config";

describe("remote chat tunables", () => {
  beforeEach(() => {
    getAllMock.mockReset();
  });

  it("reaches getChatConfigAsync for every canonical key, not only the schema's subset", async () => {
    getAllMock.mockResolvedValue({
      ...fallbackConfig,
      chat: {
        ...fallbackConfig.chat,
        writeRateLimitPerMinute: 4,
        minBid: 25,
        maxBidBudget: 5000,
        maxBidAmount: 7777,
        appTimezone: "Asia/Tokyo",
        llmModel: "vendor/model",
        chatMaxDurationSec: 120,
      },
    });

    const c = await getChatConfigAsync();

    expect(c.writeRateLimitPerMinute).toBe(4);
    expect(c.minBid).toBe(25);
    expect(c.maxBidBudget).toBe(5000);
    expect(c.maxBidAmount).toBe(7777);
    expect(c.appTimezone).toBe("Asia/Tokyo");
    expect(c.llmModel).toBe("vendor/model");
    expect(c.chatMaxDurationSec).toBe(120);
  });

  it("declares every canonical tunable in the Edge Config schema", () => {
    expect(Object.keys(chatTunablesSchema.shape).sort()).toEqual(
      Object.keys(DEFAULT_CHAT_CONFIG_VALUES).sort(),
    );
  });
});
