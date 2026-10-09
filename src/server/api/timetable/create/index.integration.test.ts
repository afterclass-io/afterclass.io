import { beforeEach, describe, expect, it } from "vitest";

import {
  idb as db,
  seedAcadTerm,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { create } from "./index";

const router = createTRPCRouter({ create });

beforeEach(async () => {
  // Pre-warm the client pool so parallel requests run concurrently on separate connections
  await Promise.all(Array.from({ length: 5 }, () => db.$queryRaw`SELECT 1`));
});

describe("timetable.create (integration)", () => {
  it("two parallel create calls race, both fulfill with the same active plan id", async () => {
    const user = await seedUser(db);
    const term = await seedAcadTerm(db);

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const results = await Promise.allSettled([
      caller.create({ acadTermId: term.id }),
      caller.create({ acadTermId: term.id }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const fulfilled = results as PromiseFulfilledResult<
      Awaited<ReturnType<typeof caller.create>>
    >[];
    const firstId = fulfilled[0]!.value.id;
    expect(fulfilled[1]!.value.id).toBe(firstId);

    const count = await db.userTimetable.count({
      where: { userId: user.id, acadTermId: term.id },
    });
    expect(count).toBe(1);

    const plan = await db.userTimetable.findFirst({
      where: { userId: user.id, acadTermId: term.id },
    });
    expect(plan?.isActive).toBe(true);
  });

  it("five parallel create calls race, all fulfill with the same active plan id", async () => {
    const user = await seedUser(db);
    const term = await seedAcadTerm(db);

    const caller = makeCaller(router.createCaller, db, {
      user: { id: user.id },
    });

    const results = await Promise.allSettled([
      caller.create({ acadTermId: term.id }),
      caller.create({ acadTermId: term.id }),
      caller.create({ acadTermId: term.id }),
      caller.create({ acadTermId: term.id }),
      caller.create({ acadTermId: term.id }),
    ]);

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const fulfilled = results as PromiseFulfilledResult<
      Awaited<ReturnType<typeof caller.create>>
    >[];
    const firstId = fulfilled[0]!.value.id;
    for (const r of fulfilled) {
      expect(r.value.id).toBe(firstId);
    }

    const count = await db.userTimetable.count({
      where: { userId: user.id, acadTermId: term.id },
    });
    expect(count).toBe(1);

    const plan = await db.userTimetable.findFirst({
      where: { userId: user.id, acadTermId: term.id },
    });
    expect(plan?.isActive).toBe(true);
  });
});
