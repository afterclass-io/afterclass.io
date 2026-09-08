import { describe, expect, inject, it } from "vitest";

import {
  idb as db,
  seedAcadTerm,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { listMine } from "./index";

const router = createTRPCRouter({ listMine });

describe("timetable.listMine (integration)", () => {
  it("returns only the caller's timetables in the requested term", async () => {
    const term = inject("acadTermId");
    const otherTerm = await seedAcadTerm(db, {
      acadYearStart: 2025,
      term: "2",
    });
    const [mine, other] = await Promise.all([seedUser(db), seedUser(db)]);
    const wanted = await db.userTimetable.create({
      data: { userId: mine.id, acadTermId: term, name: "Mine This Term" },
    });
    await db.userTimetable.create({
      data: {
        userId: mine.id,
        acadTermId: otherTerm.id,
        name: "Mine Other Term",
      },
    });
    await db.userTimetable.create({
      data: { userId: other.id, acadTermId: term, name: "Not Mine" },
    });

    const caller = makeCaller(router.createCaller, db, {
      user: { id: mine.id },
    });
    const result = await caller.listMine({ acadTermId: term });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: wanted.id,
      name: "Mine This Term",
      // Proves the `_count` include is present (undefined -> fails); a real
      // slot count would need a whole class graph, not worth it for a smoke test.
      _count: { slots: 0 },
    });
  });
});
