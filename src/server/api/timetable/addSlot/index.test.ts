import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { addSlot } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ addSlot });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable.addSlot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns created:false when the slot already exists (idempotent, no P2002 500)", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 0 });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userTimetableSlot: {
        createMany,
      },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.addSlot({ timetableId: "t1", classId: "c1" });
    expect(result.created).toBe(false);
    expect(createMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("returns created:true and creates the slot when it does not exist", async () => {
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userTimetableSlot: {
        createMany,
      },
    };
    const caller = makeCaller(dbMock);
    const result = await caller.addSlot({ timetableId: "t1", classId: "c1" });
    expect(result.created).toBe(true);
    expect(createMany).toHaveBeenCalledWith({
      data: [{ timetableId: "t1", classId: "c1" }],
      skipDuplicates: true,
    });
  });

  it("throws NOT_FOUND when the timetable does not belong to the user", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.addSlot({ timetableId: "t1", classId: "c1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects a cross-term class via assertClassInTerm", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-b" }),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.addSlot({ timetableId: "t1", classId: "c1" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
