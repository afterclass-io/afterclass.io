import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import {
  idb as db,
  randBoss,
  seedAcadTerm,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getArrangement } from "./getArrangement";
import { getBidWindows } from "./getBidWindows";
import { searchCourses } from "./searchCourses";

const router = createTRPCRouter({
  getArrangement,
  getBidWindows,
  searchCourses,
});

let ownerId: string;
let strangerId: string;
let term: string;
let timetableId: string;
let classAId: string;
let courseCode: string;
let profName: string;

beforeAll(async () => {
  const suffix = randomUUID();
  courseCode = `TTB${suffix.slice(0, 8)}`;
  profName = `Timetable Prof ${suffix.slice(0, 6)}`;

  term = (await seedAcadTerm(db)).id;

  const [owner, stranger] = await Promise.all([seedUser(db), seedUser(db)]);
  ownerId = owner.id;
  strangerId = stranger.id;

  const course = await seedCourse(db, {
    code: courseCode,
    name: "Timetable Course",
    creditUnits: 4,
  });
  const professor = await seedProfessor(db, { name: profName });

  const timings = (start: string, end: string) => ({
    create: [
      {
        startDate: new Date("2024-08-01"),
        endDate: new Date("2024-11-01"),
        dayOfWeek: "Mon",
        startTime: start,
        endTime: end,
        venue: "SR1",
      },
    ],
  });
  const exams = {
    create: [
      {
        date: new Date("2024-12-05"),
        dayOfWeek: "Fri",
        startTime: "09:00",
        endTime: "12:00",
        venue: "Hall",
      },
    ],
  };

  // Seed G2 before G1 to prove searchCourses' nested `section: "asc"` ordering.
  const classB = await db.classes.create({
    data: {
      section: "G2",
      courseId: course.id,
      acadTermId: term,
      bossId: randBoss(),
      classTimings: timings("14:00", "16:00"),
      classExamTimings: exams,
    },
  });
  const classA = await db.classes.create({
    data: {
      section: "G1",
      courseId: course.id,
      professorId: professor.id,
      acadTermId: term,
      bossId: randBoss(),
      classTimings: timings("12:00", "14:00"),
      classExamTimings: exams,
    },
  });
  classAId = classA.id;

  const timetable = await db.userTimetable.create({
    data: {
      userId: ownerId,
      acadTermId: term,
      name: "My Timetable",
      slots: { create: [{ classId: classA.id }, { classId: classB.id }] },
    },
  });
  timetableId = timetable.id;

  // Order-scrambled bid windows to prove the `[round asc, window asc]` sort.
  const windows = await Promise.all(
    [
      { round: "2", window: 1 },
      { round: "1", window: 2 },
      { round: "1", window: 1 },
    ].map((w) =>
      db.bidWindow.create({
        data: { acadTermId: term, ...w, resultsAt: new Date("2024-09-01") },
      }),
    ),
  );

  await db.userBid.create({
    data: {
      userId: ownerId,
      classId: classA.id,
      bidWindowId: windows[0]!.id,
      bidAmount: 25,
    },
  });
});

describe("timetable.getArrangement (integration)", () => {
  it("returns the owner's arranged slots with co-located bids", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    });
    const res = await caller.getArrangement({ timetableId });

    expect(res.slots.map((s) => s.section).toSorted()).toEqual(["G1", "G2"]);
    const withProf = res.slots.find((s) => s.classId === classAId);
    expect(withProf).toMatchObject({
      courseCode,
      professorName: profName,
      timings: [
        {
          dayOfWeek: "Mon",
          startTime: "12:00",
          endTime: "14:00",
          venue: "SR1",
        },
      ],
    });
    expect(res.bids).toHaveLength(1);
    expect(res.bids[0]).toMatchObject({ classId: classAId, bidAmount: 25 });
  });

  it("throws NOT_FOUND for a timetable the caller does not own", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: strangerId },
    });
    await expect(caller.getArrangement({ timetableId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("throws NOT_FOUND for an unknown timetable id", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    });
    await expect(
      caller.getArrangement({ timetableId: randomUUID() }),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("timetable.searchCourses (integration)", () => {
  it("matches on course code and maps sections in `section` order", async () => {
    const caller = makeCaller(router.createCaller, db, null);
    const res = await caller.searchCourses({
      acadTermId: term,
      query: courseCode,
    });
    expect(res).toHaveLength(1);
    expect(res[0]!.sections.map((s) => s.section)).toEqual(["G1", "G2"]);
    expect(res[0]!.sections[0]).toMatchObject({
      section: "G1",
      professorName: profName,
    });
    expect(res[0]!.sections[0]!.timings[0]).toMatchObject({
      startTime: "12:00",
      endTime: "14:00",
    });
    expect(res[0]!.sections[1]!.professorName).toBeNull();
  });

  it("matches on professor name via the OR branch", async () => {
    const caller = makeCaller(router.createCaller, db, null);
    const res = await caller.searchCourses({
      acadTermId: term,
      query: profName,
    });
    expect(res.map((c) => c.code)).toContain(courseCode);
  });
});

describe("timetable.getBidWindows (integration)", () => {
  it("returns the term's windows ordered by round then window", async () => {
    const caller = makeCaller(router.createCaller, db, {
      user: { id: ownerId },
    });
    const res = await caller.getBidWindows({ acadTermId: term });
    expect(res.map((w) => [w.round, w.window])).toEqual([
      ["1", 1],
      ["1", 2],
      ["2", 1],
    ]);
  });
});
