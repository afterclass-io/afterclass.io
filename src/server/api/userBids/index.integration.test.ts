import { beforeAll, describe, expect, inject, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { getByClassIds } from "./getByClassIds";
import { listMine } from "./listMine";

const router = createTRPCRouter({ getByClassIds, listMine });

const acadTermId = inject("acadTermId");

let mineId: string;
let otherId: string;
let course: { id: string; code: string; name: string };
let professor: { id: string; name: string };
let classWithProf: { id: string; section: string };
let classNoProf: { id: string; section: string };

beforeAll(async () => {
  const [mine, other] = await Promise.all([seedUser(db), seedUser(db)]);
  mineId = mine.id;
  otherId = other.id;

  course = await seedCourse(db, { name: "Bid Course" });
  professor = await seedProfessor(db, { name: "Bid Professor" });
  classWithProf = await db.classes.create({
    data: {
      section: "G1",
      courseId: course.id,
      professorId: professor.id,
      acadTermId,
      bossId: randBoss(),
    },
  });
  classNoProf = await db.classes.create({
    data: {
      section: "G2",
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

  await db.userBid.createMany({
    data: [
      {
        userId: mineId,
        classId: classWithProf.id,
        bidWindowId: bidWindow.id,
        bidAmount: 10,
      },
      {
        userId: mineId,
        classId: classNoProf.id,
        bidWindowId: bidWindow.id,
        bidAmount: 20,
      },
      {
        userId: otherId,
        classId: classWithProf.id,
        bidWindowId: bidWindow.id,
        bidAmount: 30,
      },
    ],
  });
});

describe("userBids.getByClassIds (integration)", () => {
  it("returns only the caller's bids for the requested classes", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: mineId },
    });

    const result = await caller.getByClassIds({ classIds: [classWithProf.id] });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      userId: mineId,
      classId: classWithProf.id,
      bidWindow: { round: "1", window: 1, resultsAt: new Date("2024-09-01") },
    });
  });
});

describe("userBids.listMine (integration)", () => {
  it("maps each bid to its joined course/section/professor", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: mineId },
    });

    const result = await caller.listMine();

    expect(result).toHaveLength(2);
    const withProf = result.find((b) => b.classId === classWithProf.id);
    const noProf = result.find((b) => b.classId === classNoProf.id);

    expect(withProf).toMatchObject({
      courseCode: course.code,
      courseName: course.name,
      section: "G1",
      professorName: professor.name,
      bidWindow: { acadTermId, round: "1", window: 1 },
    });
    expect(noProf?.professorName).toBeNull();
  });
});
