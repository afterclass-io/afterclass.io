import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

import { createTRPCRouter } from "@/server/api/trpc";
import { updatePoll } from "./updatePoll";
import { deletePoll } from "./deletePoll";

const router = createTRPCRouter({ updatePoll, deletePoll });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("meetings cross-user isolation (User A=u1 cannot mutate User B=u2 polls)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updatePoll on B's poll slug → FORBIDDEN, poll unchanged", async () => {
    const updateMock = vi.fn();
    const dbMock = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue({
          id: "poll-of-B",
          creatorId: "u2",
        }),
        update: updateMock,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.updatePoll({ slug: "poll-slug-b", title: "Compromised" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("deletePoll on B's poll slug → FORBIDDEN, poll not deleted", async () => {
    const deleteMock = vi.fn();
    const dbMock = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue({
          id: "poll-of-B",
          creatorId: "u2",
        }),
        delete: deleteMock,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.deletePoll({ slug: "poll-slug-b" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("updatePoll on nonexistent poll slug → FORBIDDEN (no 404 enumeration leakage)", async () => {
    const updateMock = vi.fn();
    const dbMock = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue(null),
        update: updateMock,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.updatePoll({ slug: "nonexistent-slug", title: "Probe" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("deletePoll on nonexistent poll slug → FORBIDDEN (no 404 enumeration leakage)", async () => {
    const deleteMock = vi.fn();
    const dbMock = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue(null),
        delete: deleteMock,
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.deletePoll({ slug: "nonexistent-slug" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletePoll by owner (u1) → succeeds and calls db.meetingPoll.delete", async () => {
    const deleteMock = vi.fn().mockResolvedValue({ id: "poll-of-A" });
    const dbMock = {
      meetingPoll: {
        findUnique: vi.fn().mockResolvedValue({
          id: "poll-of-A",
          creatorId: "u1",
        }),
        delete: deleteMock,
      },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.deletePoll({ slug: "poll-slug-a" });
    expect(result).toEqual({ success: true });
    expect(deleteMock).toHaveBeenCalledWith({
      where: { id: "poll-of-A" },
    });
  });
});
