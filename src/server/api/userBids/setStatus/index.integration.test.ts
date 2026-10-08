import { describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedCourse,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { setStatus } from "./index";

const router = createTRPCRouter({ setStatus });

const acadTermId = inject("acadTermId");

describe("userBids.setStatus (integration)", () => {
  it("budget race: parallel requests serialize so only one bid secures within the term budget", async () => {
    const user = await seedUser(db);
    await db.userBidBudget.create({
      data: {
        userId: user.id,
        acadTermId,
        balance: 100,
      },
    });

    const [courseA, courseB] = await Promise.all([
      seedCourse(db, { name: "Budget Course A" }),
      seedCourse(db, { name: "Budget Course B" }),
    ]);

    const [classA, classB] = await Promise.all([
      db.classes.create({
        data: {
          section: "G1",
          courseId: courseA.id,
          acadTermId,
          bossId: randBoss(),
        },
      }),
      db.classes.create({
        data: {
          section: "G1",
          courseId: courseB.id,
          acadTermId,
          bossId: randBoss(),
        },
      }),
    ]);

    const bidWindow = await db.bidWindow.create({
      data: {
        acadTermId,
        round: "1",
        window: 1,
        resultsAt: new Date("2024-09-01"),
      },
    });

    const [bidA, bidB] = await Promise.all([
      db.userBid.create({
        data: {
          userId: user.id,
          classId: classA.id,
          bidWindowId: bidWindow.id,
          bidAmount: 60,
        },
      }),
      db.userBid.create({
        data: {
          userId: user.id,
          classId: classB.id,
          bidWindowId: bidWindow.id,
          bidAmount: 60,
        },
      }),
    ]);

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const results = await Promise.allSettled([
      caller.setStatus({ id: bidA.id, status: "SECURED" }),
      caller.setStatus({ id: bidB.id, status: "SECURED" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({
      code: "BAD_REQUEST",
    });

    const securedCount = await db.userBid.count({
      where: { userId: user.id, status: "SECURED" },
    });
    expect(securedCount).toBe(1);
  });

  it("duplicate race: parallel requests serialize so only one section of a course is secured", async () => {
    const user = await seedUser(db);
    const course = await seedCourse(db, { name: "Duplicate Race Course" });

    const [class1, class2] = await Promise.all([
      db.classes.create({
        data: {
          section: "G1",
          courseId: course.id,
          acadTermId,
          bossId: randBoss(),
        },
      }),
      db.classes.create({
        data: {
          section: "G2",
          courseId: course.id,
          acadTermId,
          bossId: randBoss(),
        },
      }),
    ]);

    const bidWindow = await db.bidWindow.create({
      data: {
        acadTermId,
        round: "1",
        window: 1,
        resultsAt: new Date("2024-09-01"),
      },
    });

    const [bid1, bid2] = await Promise.all([
      db.userBid.create({
        data: {
          userId: user.id,
          classId: class1.id,
          bidWindowId: bidWindow.id,
          bidAmount: 20,
        },
      }),
      db.userBid.create({
        data: {
          userId: user.id,
          classId: class2.id,
          bidWindowId: bidWindow.id,
          bidAmount: 20,
        },
      }),
    ]);

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const results = await Promise.allSettled([
      caller.setStatus({ id: bid1.id, status: "SECURED" }),
      caller.setStatus({ id: bid2.id, status: "SECURED" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]!.reason).toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining(
        "already have a secured section",
      ) as string,
    });

    const securedCount = await db.userBid.count({
      where: { userId: user.id, status: "SECURED" },
    });
    expect(securedCount).toBe(1);
  });

  it("non-race happy path: secures bid and adds a timetable slot for the class", async () => {
    const user = await seedUser(db);
    const course = await seedCourse(db, { name: "Happy Path Course" });

    const cls = await db.classes.create({
      data: {
        section: "G1",
        courseId: course.id,
        acadTermId,
        bossId: randBoss(),
      },
    });

    const bidWindow = await db.bidWindow.create({
      data: {
        acadTermId,
        round: "1",
        window: 1,
        resultsAt: new Date("2024-09-01"),
      },
    });

    const bid = await db.userBid.create({
      data: {
        userId: user.id,
        classId: cls.id,
        bidWindowId: bidWindow.id,
        bidAmount: 15,
      },
    });

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const result = await caller.setStatus({ id: bid.id, status: "SECURED" });
    expect(result).toMatchObject({
      id: bid.id,
      status: "SECURED",
      acadTermId,
    });

    const updated = await db.userBid.findUnique({ where: { id: bid.id } });
    expect(updated?.status).toBe("SECURED");

    const plan = await db.userTimetable.findFirst({
      where: { userId: user.id, acadTermId, isActive: true },
    });
    expect(plan).not.toBeNull();

    const slot = await db.userTimetableSlot.findFirst({
      where: { timetableId: plan!.id, classId: cls.id },
    });
    expect(slot).not.toBeNull();
  });
});
