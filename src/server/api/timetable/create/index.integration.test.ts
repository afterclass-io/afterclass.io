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

function createBarrier(targetCount: number) {
  let count = 0;
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });

  return async function wait() {
    count += 1;
    if (count >= targetCount) {
      release();
    }
    await promise;
  };
}

beforeEach(async () => {
  // Pre-warm the client pool so parallel requests run concurrently on separate connections
  await Promise.all(Array.from({ length: 5 }, () => db.$queryRaw`SELECT 1`));
});

describe("timetable.create (integration)", () => {
  it("two parallel create calls race, both fulfill with the same active plan id", async () => {
    const user = await seedUser(db);
    const term = await seedAcadTerm(db);

    // Each caller runs its count, then waits at the barrier for the other
    // caller's count. Neither caller can reach create before both counts have
    // finished, so both read 0 and race on create. A barrier placed before the
    // count only held the calls back: under load one count could still run
    // after the other caller's create and read 1.
    const barrier = createBarrier(2);
    const wrappedDb = {
      ...db,
      userTimetable: {
        ...db.userTimetable,
        count: async (...args: Parameters<typeof db.userTimetable.count>) => {
          const result = await db.userTimetable.count(...args);
          await barrier();
          return result;
        },
      },
    };

    const caller = makeCaller(router.createCaller, wrappedDb, {
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
});
