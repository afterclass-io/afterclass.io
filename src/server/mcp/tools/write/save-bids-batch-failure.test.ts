import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { saveBidsTool } from "./save-bids";

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

function makeCaller(procs: Record<string, unknown>) {
  return {
    userBids: {
      listMine: procs.listMine,
      upsertMany: procs.upsertMany,
    },
    bidWindows: { getCurrentWindow: procs.getCurrentWindow },
    classes: { resolveByCodeSections: procs.resolveByCodeSections },
  } as unknown as ToolContext["caller"];
}

// Explicit bidWindowId on every entry keeps the default-window lookup out of play,
// so a batch-level failure leaves no succeeded term and the plan stays null.
const bids = [
  { courseCode: "COR-IS1702", section: "G1", bidAmount: 25, bidWindowId: 77 },
  { courseCode: "ACCT102", section: "G2", bidAmount: 30, bidWindowId: 77 },
];

describe("save-bids batch-level failures", () => {
  it("marks every entry failed with the resolver error and returns plan null", async () => {
    const upsertMany = vi.fn();
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getCurrentWindow: vi.fn().mockResolvedValue(null),
        listMine: vi.fn().mockResolvedValue([]),
        resolveByCodeSections: vi
          .fn()
          .mockRejectedValue(new Error("resolver down")),
        upsertMany,
      }),
    };
    const result = await saveBidsTool.run(ctx, { bids });
    expect(upsertMany).not.toHaveBeenCalled();
    expect(result.content[0]!.text).toBe(
      JSON.stringify(
        {
          updated: [
            {
              ok: false,
              index: 0,
              courseCode: "COR-IS1702",
              section: "G1",
              error: "resolver down",
            },
            {
              ok: false,
              index: 1,
              courseCode: "ACCT102",
              section: "G2",
              error: "resolver down",
            },
          ],
          plan: null,
        },
        null,
        2,
      ),
    );
  });

  it("marks every resolved entry failed with the write error and returns plan null", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getCurrentWindow: vi.fn().mockResolvedValue(null),
        listMine: vi.fn().mockResolvedValue([]),
        resolveByCodeSections: vi.fn().mockResolvedValue([
          { courseCode: "COR-IS1702", section: "G1", classId: "cl1" },
          { courseCode: "ACCT102", section: "G2", classId: "cl2" },
        ]),
        upsertMany: vi.fn().mockRejectedValue(new Error("write down")),
      }),
    };
    const result = await saveBidsTool.run(ctx, { bids });
    expect(result.content[0]!.text).toBe(
      JSON.stringify(
        {
          updated: [
            {
              ok: false,
              index: 0,
              courseCode: "COR-IS1702",
              section: "G1",
              error: "write down",
            },
            {
              ok: false,
              index: 1,
              courseCode: "ACCT102",
              section: "G2",
              error: "write down",
            },
          ],
          plan: null,
        },
        null,
        2,
      ),
    );
  });
});
