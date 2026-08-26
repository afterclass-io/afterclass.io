import { describe, expect, it } from "vitest";

import {
  idb as db,
  seedCourse,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { listMine } from "./index";

const router = createTRPCRouter({ listMine });

describe("roadmaps.listMine (integration)", () => {
  it("returns only the caller's roadmaps, with the entry count", async () => {
    const [mine, other] = await Promise.all([seedUser(db), seedUser(db)]);
    const course = await seedCourse(db, { name: "Roadmap Course" });
    const myRoadmap = await db.userRoadmap.create({
      data: { userId: mine.id, name: "My Roadmap" },
    });
    await db.userRoadmapEntry.create({
      data: {
        roadmapId: myRoadmap.id,
        courseId: course.id,
        yearNumber: 1,
        term: "T1",
        sortOrder: 0,
      },
    });
    await db.userRoadmap.create({
      data: { userId: other.id, name: "Other Roadmap" },
    });

    const caller = makeCaller(router.createCaller, db, {
      user: { id: mine.id },
    });
    const result = await caller.listMine();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: myRoadmap.id,
      name: "My Roadmap",
      _count: { entries: 1 },
    });
  });
});
