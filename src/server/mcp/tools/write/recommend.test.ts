import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { recommendBidAmountTool } from "./recommend";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const prediction = {
  id: "p1",
  classId: "cl1",
  bidWindowId: 53,
  medianPredicted: 25,
  minPredicted: 20,
  bidWindow: { id: 53, acadTermId: "t1", round: "1", window: 1 },
};

// The tool calls bidPredictions.getBy({classId}) and safetyFactors.getAll(),
// so each mock must sit under the distinct sub-router the tool uses.
function makeCaller(pred: unknown, factors: unknown[]) {
  return {
    bidPredictions: { getBy: vi.fn().mockResolvedValue(pred) },
    safetyFactors: { getAll: vi.fn().mockResolvedValue(factors) },
  } as unknown as ToolContext["caller"];
}

describe("recommend-bid-amount", () => {
  it("is read-only and suggests median x matching safety multiplier", async () => {
    const factors = [
      { acadTermId: "t1", predictionType: "MEDIAN", beatsPercentage: 70, multiplier: 1.05 },
    ];
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller(prediction, factors) };
    const result = await recommendBidAmountTool.run(ctx, { classId: "cl1", beatsPercentage: 70 });
    expect(recommendBidAmountTool.readOnly).toBe(true);
    expect(result.isError).toBeUndefined();
    const text = (result.content[0] as { text: string }).text;
    expect((JSON.parse(text) as { suggestedBidAmount: number }).suggestedBidAmount).toBe(26.25); // 25 x 1.05
  });

  it("defaults multiplier to 1.0 when no safety factor matches", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller(prediction, []) };
    const result = await recommendBidAmountTool.run(ctx, { classId: "cl1", beatsPercentage: 70 });
    const text = (result.content[0] as { text: string }).text;
    expect((JSON.parse(text) as { suggestedBidAmount: number }).suggestedBidAmount).toBe(25);
  });

  it("returns errText when there is no prediction", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller(null, []) };
    const result = await recommendBidAmountTool.run(ctx, { classId: "cl1", beatsPercentage: 70 });
    expect(result.isError).toBe(true);
  });

  it("returns errText when the prediction procedure rejects", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: {
        bidPredictions: { getBy: vi.fn().mockRejectedValue(new Error("boom")) },
        safetyFactors: { getAll: vi.fn() },
      } as unknown as ToolContext["caller"],
    };
    const result = await recommendBidAmountTool.run(ctx, { classId: "cl1", beatsPercentage: 70 });
    expect(result.isError).toBe(true);
  });

  it("exposes a bid-recommendation widget and props that parse from its JSON output", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller(prediction, []) };
    const result = await recommendBidAmountTool.run(ctx, { classId: "cl1", beatsPercentage: 70 });
    expect(recommendBidAmountTool.widgetName).toBe("bid-recommendation");
    const props = recommendBidAmountTool.toWidgetProps?.(result);
    expect(props).toMatchObject({ classId: "cl1" });
    expect(typeof (props as { suggestedBidAmount?: number }).suggestedBidAmount).toBe("number");
  });
});
