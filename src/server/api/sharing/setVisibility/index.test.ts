import { describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { setVisibility } from "./index";

const router = createTRPCRouter({ setVisibility });

// `findUnique` returns `row`; caller supplies the `update` spy it asserts on.
const mkDb = (
  entity: "userRoadmap" | "userTimetable",
  row: Record<string, unknown>,
  update: ReturnType<typeof vi.fn>,
) => ({ [entity]: { findUnique: vi.fn().mockResolvedValue(row), update } });

describe("sharing.setVisibility", () => {
  it("rejects PUBLIC visibility for timetables", async () => {
    const caller = makeCaller(router.createCaller, {});
    await expect(
      caller.setVisibility({
        entity: "timetable",
        id: "t1",
        visibility: "PUBLIC",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  // The read-path procedures (getSharedRoadmap / getSharedTimetable) have no
  // visibility check of their own — a shared link stops working only because
  // going PRIVATE nulls the share token here. These pin that invariant.
  it("clears the roadmap's share token when visibility drops to PRIVATE", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userRoadmap",
        {
          userId: "u1",
          shareToken: "tok_live",
          facultyId: null,
          publishedAt: null,
        },
        update,
      ),
    );

    const result = await caller.setVisibility({
      entity: "roadmap",
      id: "r1",
      visibility: "PRIVATE",
    });

    expect(result).toEqual({ visibility: "PRIVATE", shareToken: null });
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { visibility: "PRIVATE", shareToken: null, publishedAt: null },
    });
  });

  it("clears both the timetable's share token and iCal token when visibility drops to PRIVATE", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userTimetable",
        { userId: "u1", shareToken: "tok_live", icalToken: "ical_live" },
        update,
      ),
    );

    await caller.setVisibility({
      entity: "timetable",
      id: "t1",
      visibility: "PRIVATE",
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { visibility: "PRIVATE", shareToken: null, icalToken: null },
    });
  });

  // `shareToken ??= mintToken()` has two arms: mint when absent, preserve when
  // present. Re-sharing must never rotate a live link out from under subscribers.
  it("mints a timetable share token when going UNLISTED without one", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userTimetable",
        { userId: "u1", shareToken: null, icalToken: null },
        update,
      ),
    );

    const result = await caller.setVisibility({
      entity: "timetable",
      id: "t1",
      visibility: "UNLISTED",
    });

    expect(result.visibility).toBe("UNLISTED");
    expect(result.shareToken).toEqual(expect.any(String));
    expect(result.shareToken!.length).toBeGreaterThan(0);
    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        visibility: "UNLISTED",
        shareToken: result.shareToken,
        icalToken: null,
      },
    });
  });

  it("preserves an existing timetable share token when re-set to UNLISTED", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userTimetable",
        { userId: "u1", shareToken: "tok_live", icalToken: "ical_live" },
        update,
      ),
    );

    const result = await caller.setVisibility({
      entity: "timetable",
      id: "t1",
      visibility: "UNLISTED",
    });

    expect(result.shareToken).toBe("tok_live");
    expect(update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: {
        visibility: "UNLISTED",
        shareToken: "tok_live",
        icalToken: "ical_live",
      },
    });
  });

  it("forbids publishing a roadmap PUBLIC for an unverified user", async () => {
    const update = vi.fn();
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userRoadmap",
        { userId: "u1", shareToken: null, facultyId: null, publishedAt: null },
        update,
      ),
    );

    await expect(
      caller.setVisibility({
        entity: "roadmap",
        id: "r1",
        visibility: "PUBLIC",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(update).not.toHaveBeenCalled();
  });

  it("publishes a roadmap PUBLIC for a verified user: mints a token, stamps faculty + publishedAt", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userRoadmap",
        { userId: "u1", shareToken: null, facultyId: 5, publishedAt: null },
        update,
      ),
      { user: { id: "u1", isVerified: true } },
    );

    const result = await caller.setVisibility({
      entity: "roadmap",
      id: "r1",
      visibility: "PUBLIC",
    });

    expect(result.visibility).toBe("PUBLIC");
    expect(result.shareToken).toEqual(expect.any(String));
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        visibility: "PUBLIC",
        shareToken: result.shareToken,
        facultyId: 5,
        publishedAt: expect.any(Date) as Date,
      },
    });
  });

  it("preserves an existing roadmap share token when re-set to UNLISTED", async () => {
    const update = vi.fn().mockResolvedValue({});
    const caller = makeCaller(
      router.createCaller,
      mkDb(
        "userRoadmap",
        {
          userId: "u1",
          shareToken: "rm_tok_live",
          facultyId: null,
          publishedAt: null,
        },
        update,
      ),
    );

    const result = await caller.setVisibility({
      entity: "roadmap",
      id: "r1",
      visibility: "UNLISTED",
    });

    expect(result.shareToken).toBe("rm_tok_live");
    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        visibility: "UNLISTED",
        shareToken: "rm_tok_live",
        publishedAt: null,
      },
    });
  });
});
