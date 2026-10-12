import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { setBidStatusTool } from "./bid-status";
import { removeBidTool, upsertBidTool } from "./bids";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  aiConsent: null,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeCaller(userBids: Record<string, unknown>) {
  return { userBids } as unknown as ToolContext["caller"];
}

// Bid write tools return { updated, plan }; plan is null when the term is unknown.
describe("bid write tools without a resolvable term", () => {
  it("remove-bid returns { updated, plan: null } when listMine fails before the delete", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        listMine: vi.fn().mockRejectedValue(new Error("listMine down")),
        remove: vi.fn().mockResolvedValue({ success: true }),
      }),
    };
    const result = await removeBidTool.run(ctx, { id: "b1" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0]!.text).toBe(
      JSON.stringify({ updated: { success: true }, plan: null }, null, 2),
    );
  });

  it("upsert-bid strips notes and returns plan null when no listed bid maps to a term", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        upsert: vi.fn().mockResolvedValue({
          id: "b1",
          classId: "cl1",
          bidWindowId: 53,
          bidAmount: 25,
          notes: "private strategy",
        }),
        listMine: vi.fn().mockResolvedValue([]),
      }),
    };
    const result = await upsertBidTool.run(ctx, {
      classId: "cl1",
      bidWindowId: 53,
      bidAmount: 25,
    });
    expect(result.content[0]!.text).toBe(
      JSON.stringify(
        {
          updated: { id: "b1", classId: "cl1", bidWindowId: 53, bidAmount: 25 },
          plan: null,
        },
        null,
        2,
      ),
    );
  });

  it("set-bid-status strips notes and returns plan null when no listed bid matches", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        setStatus: vi.fn().mockResolvedValue({
          id: "b1",
          classId: "cl1",
          status: "SECURED",
          notes: "private strategy",
        }),
        listMine: vi.fn().mockResolvedValue([]),
      }),
    };
    const result = await setBidStatusTool.run(ctx, {
      id: "b1",
      status: "SECURED",
    });
    expect(result.content[0]!.text).toBe(
      JSON.stringify(
        {
          updated: { id: "b1", classId: "cl1", status: "SECURED" },
          plan: null,
        },
        null,
        2,
      ),
    );
  });
});
