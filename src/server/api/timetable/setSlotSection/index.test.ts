import { describe, expect, it, vi, beforeEach } from "vitest";

import { createTRPCRouter } from "@/server/api/trpc";
import { setSlotSection } from "./index";

vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("@/server/auth", () => ({ auth: () => null }));
vi.mock("@sentry/nextjs", () => ({
  trpcMiddleware: () => (opts: { next: () => unknown }) => opts.next(),
}));

const router = createTRPCRouter({ setSlotSection });

function makeCaller(dbMock: unknown) {
  return router.createCaller({
    db: dbMock,
    session: { user: { id: "u1" } },
    headers: new Headers(),
  } as never);
}

describe("timetable.setSlotSection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes existing slots for the course via deleteMany (idempotent, no findFirst→delete race)", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "new" });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userTimetableSlot: { deleteMany, create },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ userTimetableSlot: { deleteMany, create } }),
      ),
    };
    const caller = makeCaller(dbMock);
    await caller.setSlotSection({
      timetableId: "t1",
      courseId: "co1",
      classId: "c2",
    });
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { timetableId: "t1", class: { courseId: "co1" } },
      }),
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { timetableId: "t1", classId: "c2" },
      }),
    );
  });

  it("is idempotent when no slots exist for the course (deleteMany count=0)", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const create = vi.fn().mockResolvedValue({ id: "new" });
    const dbMock = {
      userTimetable: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "term-a" }),
      },
      classes: {
        findUnique: vi.fn().mockResolvedValue({ acadTermId: "term-a" }),
      },
      userTimetableSlot: { deleteMany, create },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ userTimetableSlot: { deleteMany, create } }),
      ),
    };
    const caller = makeCaller(dbMock);
    await caller.setSlotSection({
      timetableId: "t1",
      courseId: "co1",
      classId: "c2",
    });
    expect(deleteMany).toHaveBeenCalled();
    expect(create).toHaveBeenCalled();
  });

  it("throws NOT_FOUND when the timetable does not belong to the user", async () => {
    const dbMock = {
      userTimetable: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = makeCaller(dbMock);
    await expect(
      caller.setSlotSection({
        timetableId: "t1",
        courseId: "co1",
        classId: "c2",
      }),
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
      caller.setSlotSection({
        timetableId: "t1",
        courseId: "co1",
        classId: "c2",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
