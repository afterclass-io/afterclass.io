import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import type { db as appDb } from "@/server/db";
import { createCaller } from "@/server/api/root";
import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "@/server/mcp/types";
import { checkRoadmapFeasibilityTool } from "./feasibility";
import seedData from "../__fixtures__/feasibility.seed.json";

const goldenPath = path.resolve(
  __dirname,
  "../__fixtures__/feasibility.golden.json",
);

describe("feasibility parity (baseline 6ea5ba90 contract)", () => {
  const universityId = inject("universityId");
  const facultyId = inject("facultyId");

  const testUser: SessionUser = {
    id: seedData.user.id,
    email: seedData.user.email,
    username: seedData.user.username,
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
    // 1. Seed or update user
    await db.users.upsert({
      where: { id: seedData.user.id },
      update: {},
      create: {
        id: seedData.user.id,
        email: seedData.user.email,
        username: seedData.user.username,
        universityId,
      },
    });

    // 2. Seed or update acadTerm
    await db.acadTerm.upsert({
      where: { id: seedData.acadTerm.id },
      update: {},
      create: {
        id: seedData.acadTerm.id,
        acadYearStart: seedData.acadTerm.acadYearStart,
        acadYearEnd: seedData.acadTerm.acadYearEnd,
        term: seedData.acadTerm.term,
        bossId: 92999,
        startDt: new Date("2024-08-01"),
        endDt: new Date("2024-12-01"),
      },
    });

    // 3. Seed 40 courses
    const courseIdMap = new Map<string, string>();
    for (const c of seedData.courses) {
      const row = await db.courses.upsert({
        where: { code: c.code },
        update: {
          name: c.name,
          enrolmentRequirements: c.prereq,
        },
        create: {
          code: c.code,
          name: c.name,
          description: "Parity roadmap course",
          creditUnits: 1,
          enrolmentRequirements: c.prereq,
          belongToUniversityId: universityId,
          belongToFacultyId: facultyId,
        },
      });
      courseIdMap.set(c.code, row.id);
    }

    // 4. Seed roadmap
    await db.userRoadmap.upsert({
      where: { id: seedData.roadmap.id },
      update: { name: seedData.roadmap.title },
      create: {
        id: seedData.roadmap.id,
        name: seedData.roadmap.title,
        userId: testUser.id,
        matricTermId: seedData.acadTerm.id,
      },
    });

    // Clear previous entries for this roadmap if any
    await db.userRoadmapEntry.deleteMany({
      where: { roadmapId: seedData.roadmap.id },
    });

    // 5. Seed 40 roadmap entries
    for (let i = 0; i < seedData.courses.length; i++) {
      const c = seedData.courses[i]!;
      const courseId = courseIdMap.get(c.code)!;
      await db.userRoadmapEntry.create({
        data: {
          roadmapId: seedData.roadmap.id,
          courseId,
          yearNumber: c.year,
          term: c.term,
          sortOrder: i,
        },
      });
    }
  });

  it("produces output identical byte for byte to feasibility.golden.json", async () => {
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

    const res = await checkRoadmapFeasibilityTool.run(ctx, {
      roadmapId: seedData.roadmap.id,
    });

    expect(res.isError).toBeUndefined();
    const output: unknown = JSON.parse(res.content[0]!.text);

    const golden: unknown = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(JSON.stringify(output)).toBe(JSON.stringify(golden));
  });
});
