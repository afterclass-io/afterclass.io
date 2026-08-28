import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { setBidStatusTool } from "./bid-status";

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

// The tool calls a procedure on the userBids sub-router (setStatus), so place
// each mock under the router namespace the tool actually uses.
function makeCaller(procs: Record<string, unknown>) {
  return {
    userBids: {
      setStatus: procs.userBidsSetStatus,
    },
  } as unknown as ToolContext["caller"];
}

describe("bid-status write tool", () => {
  it("set-bid-status calls userBids.setStatus with the bid id and status", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "SECURED" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn }),
    };
    await setBidStatusTool.run(ctx, { id: "b1", status: "SECURED" });
    expect(fn).toHaveBeenCalledWith({ id: "b1", status: "SECURED" });
  });

  it("set-bid-status returns errText when userBids.setStatus rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn }),
    };
    const result = await setBidStatusTool.run(ctx, { id: "b1", status: "DROPPED" });
    expect(result.isError).toBe(true);
  });

  it("accepts every status value from the UserBidStatus enum", () => {
    for (const status of [
      "PLANNED",
      "SECURED",
      "DROPPED",
      "CANCELLED",
      "PARTICIPATED",
    ]) {
      const parsed = setBidStatusTool.inputSchema.safeParse({ id: "b1", status });
      expect(parsed.success).toBe(true);
    }
  });

  it("forwards PARTICIPATED to the procedure (5-value union)", async () => {
    const fn = vi.fn().mockResolvedValue({ id: "b1", status: "PARTICIPATED" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ userBidsSetStatus: fn }),
    };
    await setBidStatusTool.run(ctx, { id: "b1", status: "PARTICIPATED" });
    expect(fn).toHaveBeenCalledWith({ id: "b1", status: "PARTICIPATED" });
  });

  it("rejects an unknown status value", () => {
    const parsed = setBidStatusTool.inputSchema.safeParse({
      id: "b1",
      status: "WITHDRAWN",
    });
    expect(parsed.success).toBe(false);
  });
});
