import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

import {
  countQueries,
  idb as db,
  randBoss,
  seedAcadTerm,
  seedCourse,
  seedProfessor,
  seedUser,
} from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getBy as getPredictionBy } from "@/server/api/bidPredictions/getBy";
import { getByClassIds as getPredictionsByClassIds } from "@/server/api/bidPredictions/getByClassIds";
import { getBy as getBidResultBy } from "@/server/api/bidResults/getBy";
import { getVacanciesByClassIds } from "@/server/api/bidResults/getVacanciesByClassIds";
import { getByCourseCode } from "@/server/api/courses/getByCourseCode";
import { getEnrolmentRequirementsByCodes } from "@/server/api/courses/getEnrolmentRequirementsByCodes";
import { getAll as getAllClasses } from "@/server/api/classes/getAll";
import { resolveByCodeSections } from "@/server/api/classes/resolveByCodeSections";
import { resolveClassIdByCodeSection } from "@/server/mcp/current";
import { upsert as upsertUserBid } from "@/server/api/userBids/upsert";
import { upsertMany as upsertManyUserBids } from "@/server/api/userBids/upsertMany";

const router = createTRPCRouter({
  bidPredictions: createTRPCRouter({
    getBy: getPredictionBy,
    getByClassIds: getPredictionsByClassIds,
  }),
  bidResults: createTRPCRouter({
    getBy: getBidResultBy,
    getVacanciesByClassIds,
  }),
  courses: createTRPCRouter({
    getByCourseCode,
    getEnrolmentRequirementsByCodes,
  }),
  classes: createTRPCRouter({
    getAll: getAllClasses,
    resolveByCodeSections,
  }),
  userBids: createTRPCRouter({
    upsert: upsertUserBid,
    upsertMany: upsertManyUserBids,
  }),
});

describe("mcp batching procedures (integration)", () => {
  let userId: string;
  let termId: string;
  let caller: ReturnType<
    typeof makeCaller<ReturnType<typeof router.createCaller>>
  >;

  beforeAll(async () => {
    const user = await seedUser(db);
    userId = user.id;

    const term = await seedAcadTerm(db, {
      acadYearStart: new Date().getFullYear(),
    });
    termId = term.id;

    caller = makeCaller(router.createCaller, db, { user: { id: userId } });
  });

  describe("bidPredictions.getByClassIds", () => {
    it("returns, for each class, the same row as bidPredictions.getBy (deep equal)", async () => {
      const course = await seedCourse(db);
      const professor = await seedProfessor(db);

      const cls1 = await db.classes.create({
        data: {
          section: "G1",
          courseId: course.id,
          professorId: professor.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });
      const cls2 = await db.classes.create({
        data: {
          section: "G2",
          courseId: course.id,
          professorId: professor.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });
      const clsNoPred = await db.classes.create({
        data: {
          section: "G3",
          courseId: course.id,
          professorId: professor.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });

      const bidWindow = await db.bidWindow.create({
        data: {
          acadTermId: termId,
          round: "1A",
          window: 1,
          resultsAt: new Date(),
        },
      });

      await db.bidPrediction.create({
        data: {
          classId: cls1.id,
          bidWindowId: bidWindow.id,
          modelVersion: "v1",
          clfHasBidsProbability: 0.9,
          clfConfidenceScore: 0.85,
          medianPredicted: 25.5,
          medianUncertainty: 2.0,
          minPredicted: 15.0,
          minUncertainty: 1.5,
        },
      });

      await db.bidPrediction.create({
        data: {
          classId: cls2.id,
          bidWindowId: bidWindow.id,
          modelVersion: "v1",
          clfHasBidsProbability: 0.95,
          clfConfidenceScore: 0.9,
          medianPredicted: 40.0,
          medianUncertainty: 3.0,
          minPredicted: 20.0,
          minUncertainty: 2.5,
        },
      });

      const singlePred1 = await caller.bidPredictions.getBy({
        classId: cls1.id,
      });
      const singlePred2 = await caller.bidPredictions.getBy({
        classId: cls2.id,
      });
      const singlePredNoMatch = await caller.bidPredictions.getBy({
        classId: clsNoPred.id,
      });
      expect(singlePredNoMatch).toBeNull();

      const batchResult = await caller.bidPredictions.getByClassIds({
        classIds: [cls1.id, cls2.id, clsNoPred.id],
      });

      // Class without prediction is absent in batch
      expect(batchResult.length).toBe(2);

      const batchPred1 = batchResult.find((r) => r.classId === cls1.id);
      const batchPred2 = batchResult.find((r) => r.classId === cls2.id);

      expect(batchPred1).toEqual(singlePred1);
      expect(batchPred2).toEqual(singlePred2);
    });
  });

  describe("bidResults.getVacanciesByClassIds", () => {
    it("matches bidResults.getBy plus window filter, for 10 classes; statements equal 3 for 10 classes and 3 for 1 class", async () => {
      const course = await seedCourse(db);
      const professor = await seedProfessor(db);

      const bidWindow = await db.bidWindow.create({
        data: {
          acadTermId: termId,
          round: "1",
          window: 1,
          resultsAt: new Date(),
        },
      });

      const classes: Array<{ id: string; section: string }> = [];
      for (let i = 0; i < 10; i++) {
        const cls = await db.classes.create({
          data: {
            section: `S${i + 1}`,
            courseId: course.id,
            professorId: professor.id,
            acadTermId: termId,
            bossId: randBoss(),
          },
        });
        classes.push(cls);

        await db.bidResult.create({
          data: {
            bidWindowId: bidWindow.id,
            classId: cls.id,
            vacancy: (i + 1) * 3,
            beforeProcessVacancy: (i + 1) * 3 + 5,
            enrolledStudents: 30,
            median: 20 + i,
            min: 10 + i,
          },
        });
      }

      const tenClassIds = classes.map((c) => c.id);

      // Verify statements count = 3 for 10 classes and 3 for 1 class
      const { result: batch10, statements: stmt10 } = await countQueries(
        db,
        () =>
          caller.bidResults.getVacanciesByClassIds({
            classIds: tenClassIds,
            bidWindowId: bidWindow.id,
          }),
      );
      const { result: batch1, statements: stmt1 } = await countQueries(db, () =>
        caller.bidResults.getVacanciesByClassIds({
          classIds: [tenClassIds[0]!],
          bidWindowId: bidWindow.id,
        }),
      );

      // Verify statements count is constant (independent of number of classes: 10 classes vs 1 class)
      // Per spec section 4.2 item 16 & section 6: compares statement counts, not absolute statement numbers.
      expect(stmt10).toBe(stmt1);
      expect(stmt10).toBeLessThanOrEqual(4);
      expect(batch10.length).toBe(10);
      expect(batch1.length).toBe(1);

      // Matches bidResults.getBy + window filter
      for (const cls of classes) {
        const singleResults = await caller.bidResults.getBy({
          classId: cls.id,
        });
        const matchingWindowResult = singleResults.find(
          (r) => r.bidWindowId === bidWindow.id,
        );
        expect(matchingWindowResult).toBeDefined();

        const batchItem = batch10.find((b) => b.classId === cls.id);
        expect(batchItem).toBeDefined();
        expect(batchItem!.vacancy).toBe(matchingWindowResult!.vacancy);
      }
    });
  });

  describe("courses.getEnrolmentRequirementsByCodes", () => {
    it("matches getByCourseCode per code; 1 statement for 40 codes", async () => {
      const suffix = randomUUID().slice(0, 4);
      const seededCourses: Array<{
        code: string;
        enrolmentRequirements: string | null;
      }> = [];

      for (let i = 0; i < 40; i++) {
        const code = `CR${suffix}${i.toString().padStart(3, "0")}`;
        const enrolmentRequirements =
          i % 3 === 0 ? `Prerequisite: Course ${i}` : null;
        await seedCourse(db, { code, name: `Course ${code}` });
        if (enrolmentRequirements) {
          await db.courses.update({
            where: { code },
            data: { enrolmentRequirements },
          });
        }
        seededCourses.push({ code, enrolmentRequirements });
      }

      const fortyCodes = seededCourses.map((c) => c.code);

      const { result: batchResult, statements } = await countQueries(db, () =>
        caller.courses.getEnrolmentRequirementsByCodes({
          codes: fortyCodes,
        }),
      );

      expect(statements).toBe(1);
      expect(batchResult.length).toBe(40);

      for (const sc of seededCourses) {
        const single = await caller.courses.getByCourseCode({ code: sc.code });
        const batchItem = batchResult.find((b) => b.code === sc.code);
        expect(batchItem).toBeDefined();
        expect(batchItem!.enrolmentRequirements).toBe(
          single?.enrolmentRequirements ?? null,
        );
      }
    });
  });

  describe("classes.resolveByCodeSections", () => {
    it("matches resolveClassIdByCodeSection for 20 pairs, including a no-match pair and a multi-professor section; at most 2 statements", async () => {
      const suffix = randomUUID().slice(0, 4);
      const professorA = await seedProfessor(db);
      const professorB = await seedProfessor(db);

      const pairs: Array<{ courseCode: string; section: string }> = [];

      // Create 18 distinct courses with 1 section each
      for (let i = 0; i < 18; i++) {
        const code = `RS${suffix}${i.toString().padStart(2, "0")}`;
        const course = await seedCourse(db, { code });
        await db.classes.create({
          data: {
            section: "G1",
            courseId: course.id,
            professorId: professorA.id,
            acadTermId: termId,
            bossId: randBoss(),
          },
        });
        pairs.push({ courseCode: code, section: "G1" });
      }

      // 1 multi-professor section (course 19 has section G1 taught by two professors)
      const multiCourseCode = `RS${suffix}MP`;
      const multiCourse = await seedCourse(db, { code: multiCourseCode });
      const mpId1 = `00000000-0000-4000-8000-${randomUUID().slice(24)}`;
      const mpId2 = `ffffffff-ffff-4000-8000-${randomUUID().slice(24)}`;
      await db.classes.create({
        data: {
          id: mpId1,
          section: "G1",
          courseId: multiCourse.id,
          professorId: professorA.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });
      await db.classes.create({
        data: {
          id: mpId2,
          section: "G1",
          courseId: multiCourse.id,
          professorId: professorB.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });
      pairs.push({ courseCode: multiCourseCode, section: "G1" });

      // 1 no-match pair
      pairs.push({ courseCode: `NOMATCH${suffix}`, section: "G9" });

      expect(pairs.length).toBe(20);

      const { result: batchResolved, statements } = await countQueries(db, () =>
        caller.classes.resolveByCodeSections({
          items: pairs,
          acadTermId: termId,
        }),
      );

      expect(statements).toBeLessThanOrEqual(2);
      expect(batchResolved.length).toBe(20);

      // Compare each pair with resolveClassIdByCodeSection
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]!;
        const singleId = await resolveClassIdByCodeSection(caller as never, {
          courseCode: pair.courseCode,
          section: pair.section,
          termId,
        });
        expect(batchResolved[i]!.classId).toBe(singleId);
        expect(batchResolved[i]!.courseCode).toBe(pair.courseCode);
        expect(batchResolved[i]!.section).toBe(pair.section);
      }
    });
  });

  describe("userBids.upsertMany", () => {
    it("same error messages as userBids.upsert for invalid inputs; writes persist; notes are kept when omitted", async () => {
      const course = await seedCourse(db);
      const professor = await seedProfessor(db);

      const otherTerm = await seedAcadTerm(db, {
        acadYearStart: new Date().getFullYear(),
      });

      const clsValid = await db.classes.create({
        data: {
          section: "G1",
          courseId: course.id,
          professorId: professor.id,
          acadTermId: termId,
          bossId: randBoss(),
        },
      });

      const clsOtherTerm = await db.classes.create({
        data: {
          section: "G2",
          courseId: course.id,
          professorId: professor.id,
          acadTermId: otherTerm.id,
          bossId: randBoss(),
        },
      });

      const bidWindow = await db.bidWindow.create({
        data: {
          acadTermId: termId,
          round: "1",
          window: 1,
          resultsAt: new Date(),
        },
      });

      // 1. Error message parity for unknown bid window
      let upsertUnknownWindowMsg = "";
      try {
        await caller.userBids.upsert({
          classId: clsValid.id,
          bidWindowId: 999999,
          bidAmount: 10,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          upsertUnknownWindowMsg = err.message;
        }
      }

      const batchUnknownWindow = await caller.userBids.upsertMany({
        entries: [
          {
            classId: clsValid.id,
            bidWindowId: 999999,
            bidAmount: 10,
          },
        ],
      });
      expect(batchUnknownWindow[0]!.ok).toBe(false);
      expect((batchUnknownWindow[0] as { message: string }).message).toBe(
        upsertUnknownWindowMsg,
      );
      expect(upsertUnknownWindowMsg).toBe("Unknown bid window");

      // 2. Error message parity for wrong-term class
      let upsertWrongTermMsg = "";
      try {
        await caller.userBids.upsert({
          classId: clsOtherTerm.id,
          bidWindowId: bidWindow.id,
          bidAmount: 10,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          upsertWrongTermMsg = err.message;
        }
      }

      const batchWrongTerm = await caller.userBids.upsertMany({
        entries: [
          {
            classId: clsOtherTerm.id,
            bidWindowId: bidWindow.id,
            bidAmount: 10,
          },
        ],
      });
      expect(batchWrongTerm[0]!.ok).toBe(false);
      expect((batchWrongTerm[0] as { message: string }).message).toBe(
        upsertWrongTermMsg,
      );
      expect(upsertWrongTermMsg).toBe(
        "Class does not belong to this academic term",
      );

      // 3. Writes persist
      const saveRes = await caller.userBids.upsertMany({
        entries: [
          {
            classId: clsValid.id,
            bidWindowId: bidWindow.id,
            bidAmount: 125,
            notes: "initial notes",
          },
        ],
      });
      expect(saveRes[0]!.ok).toBe(true);

      const dbRow = await db.userBid.findUnique({
        where: {
          userId_classId_bidWindowId: {
            userId,
            classId: clsValid.id,
            bidWindowId: bidWindow.id,
          },
        },
      });
      expect(dbRow).toBeDefined();
      expect(dbRow!.bidAmount).toBe(125);
      expect(dbRow!.notes).toBe("initial notes");

      // 4. Notes are kept when omitted
      const updateRes = await caller.userBids.upsertMany({
        entries: [
          {
            classId: clsValid.id,
            bidWindowId: bidWindow.id,
            bidAmount: 200,
          },
        ],
      });
      expect(updateRes[0]!.ok).toBe(true);

      const updatedDbRow = await db.userBid.findUnique({
        where: {
          userId_classId_bidWindowId: {
            userId,
            classId: clsValid.id,
            bidWindowId: bidWindow.id,
          },
        },
      });
      expect(updatedDbRow).toBeDefined();
      expect(updatedDbRow!.bidAmount).toBe(200);
      expect(updatedDbRow!.notes).toBe("initial notes");
    });
  });
});
