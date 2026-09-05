import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { setMatricTerm } from "./index";

const router = createTRPCRouter({ setMatricTerm });

describe("roadmaps.setMatricTerm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets matricTermId for the owned roadmap", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          matricTermId: "AY202425T1",
        }),
      },
      acadTerm: {
        findUnique: vi.fn().mockResolvedValue({ id: "AY202425T1" }),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setMatricTerm({
      roadmapId: "r1",
      matricTermId: "AY202425T1",
    });
    expect(dbMock.acadTerm.findUnique).toHaveBeenCalledWith({
      where: { id: "AY202425T1" },
    });
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { matricTermId: "AY202425T1" },
    });
  });

  it("clears matricTermId when null is passed", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u1",
          matricTermId: null,
        }),
      },
      acadTerm: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await caller.setMatricTerm({ roadmapId: "r1", matricTermId: null });
    expect(dbMock.acadTerm.findUnique).not.toHaveBeenCalled();
    expect(dbMock.userRoadmap.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { matricTermId: null },
    });
  });

  it("rejects an unknown academic term", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({ id: "r1", userId: "u1" }),
        update: vi.fn(),
      },
      acadTerm: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.setMatricTerm({ roadmapId: "r1", matricTermId: "nope" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });

  it("rejects roadmaps owned by another user", async () => {
    const dbMock = {
      userRoadmap: {
        findUnique: vi.fn().mockResolvedValue({
          id: "r1",
          userId: "u2",
        }),
        update: vi.fn(),
      },
      acadTerm: {
        findUnique: vi.fn(),
      },
    };
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(
      caller.setMatricTerm({ roadmapId: "r1", matricTermId: "AY202425T1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMock.userRoadmap.update).not.toHaveBeenCalled();
  });
});
