import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, inject, it } from "vitest";

import { idb as db } from "@/server/api/integration-test-helpers";
import type { db as appDb } from "@/server/db";
import { createCaller } from "@/server/api/root";
import type { SessionUser } from "@/server/auth/config";
import type { ToolContext } from "@/server/mcp/types";
import { saveBidsTool } from "./save-bids";
import seedData from "../__fixtures__/save-bids.seed.json";

const goldenPath = path.resolve(
  __dirname,
  "../__fixtures__/save-bids.golden.json",
);

describe("save-bids parity (baseline 6ea5ba90 contract)", () => {
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
    // 1. Seed user
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

    // 2. Seed academic terms
    for (const term of seedData.acadTerms) {
      try {
        await db.acadTerm.create({
          data: {
            id: term.id,
            acadYearStart: term.acadYearStart,
            acadYearEnd: term.acadYearEnd,
            term: term.term,
            bossId: term.id.includes("T1") ? 91999 : 93002,
            startDt: new Date("2024-08-01"),
            endDt: new Date("2024-12-01"),
          },
        });
      } catch {
        // already exists
      }
    }

    // 3. Seed bid windows
    for (const win of seedData.bidWindows) {
      try {
        await db.bidWindow.create({
          data: {
            id: win.id,
            acadTermId: win.acadTermId,
            round: win.round,
            window: win.window,
            opensAt: new Date(win.opensAt),
            resultsAt: new Date(win.resultsAt),
          },
        });
      } catch {
        // already exists
      }
    }

    // 4. Seed user budget
    await db.userBidBudget.upsert({
      where: {
        userId_acadTermId: {
          userId: testUser.id,
          acadTermId: seedData.acadTerms[0]!.id,
        },
      },
      update: { balance: seedData.userBidBudget.balance },
      create: {
        userId: testUser.id,
        acadTermId: seedData.acadTerms[0]!.id,
        balance: seedData.userBidBudget.balance,
      },
    });

    // 5. Seed 20 courses, classes, and initial user bids
    for (const item of seedData.classes) {
      const course = await db.courses.upsert({
        where: { code: item.courseCode },
        update: {},
        create: {
          code: item.courseCode,
          name: `Course ${item.courseCode}`,
          description: "Parity save-bids course",
          creditUnits: 1,
          belongToUniversityId: universityId,
          belongToFacultyId: facultyId,
        },
      });

      await db.classes.upsert({
        where: { id: item.classId },
        update: {
          section: item.section,
          courseId: course.id,
          acadTermId: seedData.acadTerms[0]!.id,
        },
        create: {
          id: item.classId,
          section: item.section,
          courseId: course.id,
          acadTermId: seedData.acadTerms[0]!.id,
          bossId: item.bossId,
        },
      });

      await db.userBid.upsert({
        where: {
          userId_classId_bidWindowId: {
            userId: testUser.id,
            classId: item.classId,
            bidWindowId: seedData.bidWindows[0]!.id,
          },
        },
        update: {
          bidAmount: 10,
          notes: "initial note",
        },
        create: {
          id: item.bidId,
          userId: testUser.id,
          classId: item.classId,
          bidWindowId: seedData.bidWindows[0]!.id,
          bidAmount: 10,
          notes: "initial note",
          status: "PLANNED",
          createdAt: new Date("2024-01-01T00:00:00Z"),
        },
      });
    }
  });

  it("produces output identical to save-bids.golden.json and writes expected db rows", async () => {
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

    // 1. Run 20 valid bids
    const validRes = await saveBidsTool.run(ctx, {
      bids: seedData.validBids,
    });
    expect(validRes.isError).toBeUndefined();
    const validOutput: unknown = JSON.parse(validRes.content[0]!.text);

    // 2. Run 3 failure cases
    const failureRes = await saveBidsTool.run(ctx, {
      bids: seedData.failureBids,
    });
    expect(failureRes.isError).toBeUndefined();
    const failureOutput: unknown = JSON.parse(failureRes.content[0]!.text);

    const actual: Record<string, unknown> = {
      valid: validOutput,
      failures: failureOutput,
    };

    const golden: unknown = JSON.parse(fs.readFileSync(goldenPath, "utf-8"));
    expect(JSON.stringify(actual)).toBe(JSON.stringify(golden));

    // 3. Verify database rows equal rows written by the sequence
    const rows = await db.userBid.findMany({
      where: {
        userId: testUser.id,
        bidWindowId: seedData.bidWindows[0]!.id,
      },
      orderBy: { classId: "asc" },
    });

    expect(rows).toHaveLength(20);
    for (const bid of seedData.validBids) {
      const classItem = seedData.classes.find(
        (c) => c.courseCode === bid.courseCode,
      )!;
      const row = rows.find((r) => r.classId === classItem.classId);
      expect(row).toBeDefined();
      expect(row!.bidAmount).toBe(bid.bidAmount);
      expect(row!.status).toBe("PLANNED");
    }
  });
});
