import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { updateFaculty } from "./index";

const router = createTRPCRouter({ updateFaculty });

describe("users.updateFaculty", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated caller", async () => {
    const dbMock = { faculties: { findUnique: vi.fn() }, users: { update: vi.fn() } };
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.updateFaculty({ facultyId: 1 })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("sets the current user's faculty when the faculty exists", async () => {
    const dbMock = {
      faculties: { findUnique: vi.fn().mockResolvedValue({ id: 1 }) },
      users: {
        update: vi.fn().mockResolvedValue({ id: "u1", facultyId: 1 }),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    const result = await caller.updateFaculty({ facultyId: 1 });

    expect(result).toEqual({ id: "u1", facultyId: 1 });
    expect(dbMock.faculties.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(dbMock.users.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { facultyId: 1 },
    });
  });

  it("rejects an unknown faculty", async () => {
    const dbMock = {
      faculties: { findUnique: vi.fn().mockResolvedValue(null) },
      users: { update: vi.fn() },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.updateFaculty({ facultyId: 999 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.users.update).not.toHaveBeenCalled();
  });

  it("rejects a non-integer facultyId", async () => {
    const dbMock = {
      faculties: { findUnique: vi.fn() },
      users: { update: vi.fn() },
    };
    const caller = makeCaller(router.createCaller, dbMock);

    await expect(caller.updateFaculty({ facultyId: 1.5 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.faculties.findUnique).not.toHaveBeenCalled();
  });
});
