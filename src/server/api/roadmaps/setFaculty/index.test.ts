import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { setFaculty } from "./index";

const router = createTRPCRouter({ setFaculty });

describe("roadmaps.setFaculty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets facultyId for the owned roadmap", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
        update: vi.fn().mockResolvedValue({ id: "r1", facultyId: 2 }),
      },
      faculties: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 2, name: "SCIS", acronym: "SCIS" }),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setFaculty({ roadmapId: "r1", facultyId: 2 });
    expect(dbMock.faculties.findUnique).toHaveBeenCalledWith({
      where: { id: 2 },
    });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { facultyId: 2 },
    });
  });

  it("clears facultyId when null", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
        update: vi.fn().mockResolvedValue({ id: "r1", facultyId: null }),
      },
      faculties: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setFaculty({ roadmapId: "r1", facultyId: null });
    expect(dbMock.faculties.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { facultyId: null },
    });
  });

  it("rejects roadmaps owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u2" }),
        update: vi.fn(),
      },
      faculties: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.setFaculty({ roadmapId: "r1", facultyId: 2 }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });

  it("rejects unknown facultyId", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
        update: vi.fn(),
      },
      faculties: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.setFaculty({ roadmapId: "r1", facultyId: 999 }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
