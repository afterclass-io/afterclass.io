import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getSharedRoadmap } from "./getSharedRoadmap";
import { getSharedTimetable } from "./getSharedTimetable";

vi.mock("@/server/assistant/budget", () => ({
  checkBudget: vi.fn().mockResolvedValue({ ok: true, retryAfterSeconds: 0 }),
}));

const mockGetEdgeConfig = vi.fn<() => Promise<unknown>>();
vi.mock("@/server/ecfg/edge-config", () => ({
  getEdgeConfig: () => mockGetEdgeConfig(),
}));

const router = createTRPCRouter({ getSharedRoadmap, getSharedTimetable });

const roadmapRow = {
  id: "r1",
  name: "Grad Plan",
  user: { username: "alice" },
  entries: [],
};

const timetableRow = {
  name: "Plan A",
  user: { username: "alice" },
  slots: [],
};

const signedIn = { user: { id: "u1" } };

/** `isPublic` is what the anonymous PUBLIC-visibility probe finds. */
const roadmapCaller = (session: typeof signedIn | null, isPublic: boolean) =>
  makeCaller(
    router.createCaller,
    {
      userRoadmap: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce(roadmapRow)
          .mockResolvedValue(isPublic ? { id: "r1" } : null),
      },
    },
    session,
  );

const publicRoadmaps = (value: boolean) =>
  mockGetEdgeConfig.mockResolvedValue({
    publicData: { publicRoadmaps: value },
  });

describe("sharing.getSharedRoadmap auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicRoadmaps(false);
  });

  it("serves UNLISTED roadmaps to signed-in users only", async () => {
    publicRoadmaps(true);
    await expect(
      roadmapCaller(signedIn, false).getSharedRoadmap({ token: "t" }),
    ).resolves.toMatchObject({ ownerUsername: "alice" });
    await expect(
      roadmapCaller(null, false).getSharedRoadmap({ token: "t" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("serves PUBLIC roadmaps to anonymous callers only while publicRoadmaps is public", async () => {
    await expect(
      roadmapCaller(null, true).getSharedRoadmap({ token: "t" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    publicRoadmaps(true);
    await expect(
      roadmapCaller(null, true).getSharedRoadmap({ token: "t" }),
    ).resolves.toMatchObject({ ownerUsername: "alice" });
  });

  it("serves PUBLIC roadmaps to signed-in users while publicRoadmaps is private", async () => {
    await expect(
      roadmapCaller(signedIn, true).getSharedRoadmap({ token: "t" }),
    ).resolves.toMatchObject({ ownerUsername: "alice" });
  });
});

describe("sharing.getSharedTimetable auth", () => {
  const timetableCaller = (session: typeof signedIn | null) =>
    makeCaller(
      router.createCaller,
      {
        userTimetable: { findUnique: vi.fn().mockResolvedValue(timetableRow) },
      },
      session,
    );

  it("rejects anonymous callers", async () => {
    await expect(
      timetableCaller(null).getSharedTimetable({ token: "t" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("serves signed-in callers", async () => {
    await expect(
      timetableCaller(signedIn).getSharedTimetable({ token: "t" }),
    ).resolves.toMatchObject({ timetable: { name: "Plan A" } });
  });
});
