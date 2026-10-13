import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { remove } from "./remove";
import { rename } from "./rename";
import { setActive } from "./setActive";

// The ownership lookup for these procedures is scoped on { id, userId }, so a
// row owned by someone else reads as null and must surface as NOT_FOUND,
// not FORBIDDEN. These cases pin that code and that a found row proceeds.

const router = createTRPCRouter({ remove, rename, setActive });

describe("timetable owned lookup", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("remove", () => {
    it("rejects with NOT_FOUND when the lookup returns null", async () => {
      const dbMock = {
        userTimetable: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: vi.fn(),
        },
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await expect(caller.remove({ timetableId: "t1" })).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("proceeds to delete when the lookup returns a row", async () => {
      const dbMock = {
        userTimetable: {
          findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
          delete: vi.fn().mockResolvedValue({ id: "t1" }),
        },
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await caller.remove({ timetableId: "t1" });
      expect(dbMock.userTimetable.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe("rename", () => {
    it("rejects with NOT_FOUND when the lookup returns null", async () => {
      const dbMock = {
        userTimetable: {
          findUnique: vi.fn().mockResolvedValue(null),
          update: vi.fn(),
        },
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await expect(
        caller.rename({ timetableId: "t1", name: "New" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("proceeds to update when the lookup returns a row", async () => {
      const dbMock = {
        userTimetable: {
          findUnique: vi.fn().mockResolvedValue({ id: "t1", userId: "u1" }),
          update: vi.fn().mockResolvedValue({ id: "t1", name: "New" }),
        },
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await caller.rename({ timetableId: "t1", name: "New" });
      expect(dbMock.userTimetable.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("setActive", () => {
    it("rejects with NOT_FOUND when the lookup returns null", async () => {
      const dbMock = {
        userTimetable: { findUnique: vi.fn().mockResolvedValue(null) },
        $transaction: vi.fn(),
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await expect(
        caller.setActive({ timetableId: "t1" }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
      expect(dbMock.$transaction).not.toHaveBeenCalled();
    });

    it("proceeds to the transaction when the lookup returns a row", async () => {
      const dbMock = {
        userTimetable: {
          findUnique: vi
            .fn()
            .mockResolvedValue({ id: "t1", userId: "u1", acadTermId: "a" }),
        },
        $transaction: vi.fn().mockResolvedValue(undefined),
      };
      const caller = makeCaller(router.createCaller, dbMock);
      await caller.setActive({ timetableId: "t1" });
      expect(dbMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
