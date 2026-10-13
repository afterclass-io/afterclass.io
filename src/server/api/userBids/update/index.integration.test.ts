import { describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedCourse,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { update } from "./index";

const router = createTRPCRouter({ update });

const acadTermId = inject("acadTermId");

describe("userBids.update (integration)", () => {
  it("budget race: parallel updates serialize so only one secured bid can be raised within budget", async () => {
    const user = await seedUser(db);
    await db.userBidBudget.create({
      data: {
        userId: user.id,
        acadTermId,
        balance: 100,
      },
    });

    const [courseA, courseB] = await Promise.all([
      seedCourse(db, { name: "Update Budget Course A" }),
      seedCourse(db, { name: "Update Budget Course B" }),
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
          bidAmount: 30,
          status: "SECURED",
        },
      }),
      db.userBid.create({
        data: {
          userId: user.id,
          classId: classB.id,
          bidWindowId: bidWindow.id,
          bidAmount: 30,
          status: "SECURED",
        },
      }),
    ]);

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const results = await Promise.allSettled([
      caller.update({ id: bidA.id, bidAmount: 70 }),
      caller.update({ id: bidB.id, bidAmount: 70 }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(["BAD_REQUEST", "CONFLICT"]).toContain(
      (rejected[0]!.reason as { code?: string }).code,
    );

    const securedBids = await db.userBid.findMany({
      where: { userId: user.id, status: "SECURED" },
      select: { bidAmount: true },
    });
    const totalSecured = securedBids.reduce((sum, b) => sum + b.bidAmount, 0);
    expect(totalSecured).toBeLessThanOrEqual(100);
  });
});
