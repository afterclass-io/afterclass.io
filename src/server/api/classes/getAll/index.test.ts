import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getAll } from "./index";

const router = createTRPCRouter({ getAll });

/** `getCurrentWindowLogic` reads this; a non-empty list resolves to a term. */
const upcomingWindow = {
  opensAt: new Date("2999-01-01"),
  resultsAt: new Date("2999-02-01"),
  acadTermId: "T-CURRENT",
  acadTerm: {},
};

function makeDb(bidWindows: unknown[] = []) {
  return {
    classes: { findMany: vi.fn().mockResolvedValue([]) },
    bidWindow: { findMany: vi.fn().mockResolvedValue(bidWindows) },
  };
}

const base = { limit: 100 };

/** The single `findMany` call's argument object. */
const lastArg = (db: ReturnType<typeof makeDb>) =>
  db.classes.findMany.mock.lastCall![0] as {
    where: Record<string, unknown>;
    take: number;
  };

beforeEach(() => vi.clearAllMocks());

describe("classes.getAll — current-term resolution", () => {
  it("resolves the default term from the current bid window when id and acadTermId are both absent", async () => {
    const db = makeDb([upcomingWindow]);
    await makeCaller(router.createCaller, db, null).getAll({ ...base });

    expect(db.bidWindow.findMany).toHaveBeenCalledOnce();
    expect(lastArg(db).where.acadTermId).toBe("T-CURRENT");
  });

  it("leaves acadTermId undefined when no window has dates", async () => {
    const db = makeDb([]);
    await makeCaller(router.createCaller, db, null).getAll({ ...base });

    expect(lastArg(db).where.acadTermId).toBeUndefined();
  });

  it("skips window resolution when acadTermId is given", async () => {
    const db = makeDb([upcomingWindow]);
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      acadTermId: "T-2024",
    });

    expect(db.bidWindow.findMany).not.toHaveBeenCalled();
    expect(lastArg(db).where.acadTermId).toBe("T-2024");
  });

  it("skips window resolution for a by-id lookup and does not force a term default", async () => {
    const db = makeDb([upcomingWindow]);
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      id: "class-1",
    });

    expect(db.bidWindow.findMany).not.toHaveBeenCalled();
    expect(lastArg(db).where.id).toBe("class-1");
    expect(lastArg(db).where.acadTermId).toBeUndefined();
  });

  it("keeps an explicit acadTermId alongside a by-id lookup", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      id: "class-1",
      acadTermId: "T-2024",
    });

    expect(lastArg(db).where.acadTermId).toBe("T-2024");
  });
});

describe("classes.getAll — session filter assembly", () => {
  it("omits the classTimings filter when no session filter is given", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      acadTermId: "T",
    });

    expect(lastArg(db).where.classTimings).toBeUndefined();
  });

  it("assembles day, startsAfter and endsBefore into a single AND clause", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      acadTermId: "T",
      day: "Mon",
      startsAfter: "12:00",
      endsBefore: "14:30",
    });

    expect(lastArg(db).where.classTimings).toEqual({
      some: {
        AND: [
          { dayOfWeek: "Mon" },
          { startTime: { gte: "12:00" } },
          { endTime: { lte: "14:30" } },
        ],
      },
    });
  });

  it("includes only the filters that are set", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      ...base,
      acadTermId: "T",
      day: "Fri",
    });

    expect(lastArg(db).where.classTimings).toEqual({
      some: { AND: [{ dayOfWeek: "Fri" }] },
    });
  });
});

describe("classes.getAll — limit clamp", () => {
  it("clamps a limit above 100 down to 100", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      acadTermId: "T",
      limit: 500,
    });

    expect(lastArg(db).take).toBe(100);
  });

  it("passes a limit at or below 100 through unchanged", async () => {
    const db = makeDb();
    await makeCaller(router.createCaller, db, null).getAll({
      acadTermId: "T",
      limit: 25,
    });

    expect(lastArg(db).take).toBe(25);
  });
});
