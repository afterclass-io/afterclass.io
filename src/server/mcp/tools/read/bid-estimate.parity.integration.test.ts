import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import type { db as appDb } from "@/server/db";
import { createCaller } from "@/server/api/root";
import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "@/server/mcp/types";
import { bidEstimateTool } from "./bid-estimate";
import type { PredictionType } from "@/generated/prisma/enums";
import seedData from "../__fixtures__/bid-estimate.seed.json";

const goldenPath = path.resolve(
  __dirname,
  "../__fixtures__/bid-estimate.golden.json",
);

describe("bid-estimate parity (baseline 6ea5ba90 contract)", () => {
  const universityId = inject("universityId");
  const facultyId = inject("facultyId");

  const testUser: SessionUser = {
    id: "usr-parity-bid-estimate",
    email: "bid-estimate-parity@example.edu",
    username: "parity_bid_estimator",
    isVerified: true,
    aiConsent: null,
    universityId,
    firstName: null,
    lastName: null,
    telegramId: null,
    photoUrl: null,
    facultyId,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeAll(async () => {
    // 1. Seed or update acadTerm
    try {
      await db.acadTerm.create({
        data: {
          id: seedData.acadTerm.id,
          acadYearStart: seedData.acadTerm.acadYearStart,
          acadYearEnd: seedData.acadTerm.acadYearEnd,
          term: seedData.acadTerm.term,
          bossId: 91999,
          startDt: new Date("2024-08-01"),
          endDt: new Date("2024-12-01"),
        },
      });
    } catch {
      // already exists
    }

    // 2. Seed or update bidWindow
    try {
      await db.bidWindow.create({
        data: {
          id: seedData.bidWindow.id,
          acadTermId: seedData.bidWindow.acadTermId,
          round: seedData.bidWindow.round,
          window: seedData.bidWindow.window,
          opensAt: new Date(seedData.bidWindow.opensAt),
          resultsAt: new Date(seedData.bidWindow.resultsAt),
        },
      });
    } catch {
      // already exists
    }

    // 3. Seed safety factors
    for (const sf of seedData.safetyFactors) {
      await db.safetyFactor.upsert({
        where: {
          acadTermId_predictionType_beatsPercentage_multiplierType: {
            acadTermId: sf.acadTermId,
            predictionType: sf.predictionType as PredictionType,
            beatsPercentage: sf.beatsPercentage,
            multiplierType: "EMPIRICAL",
          },
        },
        update: { multiplier: sf.multiplier },
        create: {
          acadTermId: sf.acadTermId,
          predictionType: sf.predictionType as PredictionType,
          beatsPercentage: sf.beatsPercentage,
          multiplierType: "EMPIRICAL",
          multiplier: sf.multiplier,
        },
      });
    }

    // 4. Seed course
    const course = await db.courses.upsert({
      where: { code: seedData.course.code },
      update: { name: seedData.course.name },
      create: {
        code: seedData.course.code,
        name: seedData.course.name,
        description: "Parity test course",
        creditUnits: 1,
        belongToUniversityId: universityId,
        belongToFacultyId: facultyId,
      },
    });

    // 5. Seed 10 sections with professors, classes, predictions, and results
    for (const sec of seedData.sections) {
      const prof = await db.professors.upsert({
        where: { slug: sec.professor.slug },
        update: { name: sec.professor.name },
        create: {
          name: sec.professor.name,
          slug: sec.professor.slug,
          email: `${sec.professor.slug}@example.edu`,
          photoUrl: "https://example.edu/p.jpg",
          profileUrl: "https://example.edu/p",
          belongToUniversityId: universityId,
        },
      });

      await db.classes.upsert({
        where: { id: sec.classId },
        update: {
          section: sec.section,
          courseId: course.id,
          professorId: prof.id,
          acadTermId: seedData.acadTerm.id,
        },
        create: {
          id: sec.classId,
          section: sec.section,
          courseId: course.id,
          professorId: prof.id,
          acadTermId: seedData.acadTerm.id,
          bossId: sec.bossId,
        },
      });

      await db.bidPrediction.upsert({
        where: {
          classId_bidWindowId: {
            classId: sec.classId,
            bidWindowId: seedData.bidWindow.id,
          },
        },
        update: {
          medianPredicted: sec.prediction.medianPredicted,
          minPredicted: sec.prediction.minPredicted,
          medianUncertainty: sec.prediction.medianUncertainty,
        },
        create: {
          classId: sec.classId,
          bidWindowId: seedData.bidWindow.id,
          modelVersion: "v1.0",
          clfHasBidsProbability: 1,
          clfConfidenceScore: 1,
          medianPredicted: sec.prediction.medianPredicted,
          medianUncertainty: sec.prediction.medianUncertainty,
          minPredicted: sec.prediction.minPredicted,
          minUncertainty: sec.prediction.medianUncertainty,
        },
      });

      await db.bidResult.upsert({
        where: {
          bidWindowId_classId: {
            bidWindowId: seedData.bidWindow.id,
            classId: sec.classId,
          },
        },
        update: { vacancy: sec.vacancy },
        create: {
          bidWindowId: seedData.bidWindow.id,
          classId: sec.classId,
          vacancy: sec.vacancy,
          beforeProcessVacancy: sec.vacancy,
          enrolledStudents: 0,
        },
      });
    }
  });

  it("produces output identical byte for byte to bid-estimate.golden.json", async () => {
    const caller = createCaller(async () => ({
      db: db as unknown as typeof appDb,
      session: {
        user: testUser,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      headers: new Headers(),
    }));

    const ctx: ToolContext = {
      user: testUser,
      caller,
    };

    const res = await bidEstimateTool.run(ctx, {
      courseCode: seedData.course.code,
    });

    expect(res.isError).toBeUndefined();
    const output: unknown = JSON.parse(res.content[0]!.text);

    const golden: unknown = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(JSON.stringify(output)).toBe(JSON.stringify(golden));
  });
});
