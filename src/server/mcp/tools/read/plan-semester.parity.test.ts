import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { planSemesterTool } from "./plan-semester";

// Parity: the tool fetches every term's catalog hits in one batched call. Its
// JSON must equal the output of the earlier flow, one search per term with an
// early stop once enough courses are found. `perTermReference` below is that
// flow. Both read one fixture, and each search keeps the top 20 of a term.

type Hit = { id: string; code: string; name: string; creditUnits: number };

const PER_TERM_CAP = 20;

const course = (n: number): Hit => ({
  id: `c${n}`,
  code: `ACCT${String(100 + n)}`,
  name: `Course ${n}`,
  creditUnits: 1,
});

const range = (from: number, to: number): Hit[] =>
  Array.from({ length: to - from + 1 }, (_, i) => course(from + i));

// Term 1 matches 25 courses (the cap drops five), term 2 overlaps and adds
// new ones, term 3 holds a single new course.
const MATCHES: Record<string, Hit[]> = {
  "2025-T3A": range(1, 25),
  "2025-T3B": [...range(18, 30), course(2)],
  "2026-T1": [course(40), course(3)],
};
const TERMS = ["2025-T3A", "2025-T3B", "2026-T1"];

const ranked = (acadTermId: string): Hit[] =>
  (MATCHES[acadTermId] ?? []).slice(0, PER_TERM_CAP);

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  aiConsent: null,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const emptyPlan = {
  targetTerm: { id: "2025-T3A", acadYearStart: 2025, term: "3A" },
  userPosition: null,
  candidates: [],
  totalSeniors: 0,
};

/** The earlier flow: one search per term, stop when the limit is met. */
async function perTermReference(limit: number): Promise<string> {
  const byCourse = new Map<string, Hit & { offeredIn: string[] }>();
  for (const acadTermId of TERMS) {
    for (const h of ranked(acadTermId)) {
      const agg = byCourse.get(h.id);
      if (agg) agg.offeredIn.push(acadTermId);
      else byCourse.set(h.id, { ...h, offeredIn: [acadTermId] });
    }
    if (byCourse.size >= limit) break;
  }
  return JSON.stringify(
    {
      ...emptyPlan,
      reason: "fallback-catalog",
      candidates: [...byCourse.values()].slice(0, limit).map((c) => ({
        courseId: c.id,
        code: c.code,
        name: c.name,
        creditUnits: c.creditUnits,
        offeredIn: c.offeredIn,
      })),
    },
    null,
    2,
  );
}

async function batchedTool(limit: number): Promise<string> {
  const searchCoursesByTerms = vi.fn(async (input: { acadTermIds: string[] }) =>
    input.acadTermIds.map((acadTermId) => ({
      acadTermId,
      courses: ranked(acadTermId),
    })),
  );
  const ctx: ToolContext = {
    user: fakeUser,
    caller: {
      roadmaps: { planSemester: vi.fn().mockResolvedValue(emptyPlan) },
      timetable: { searchCoursesByTerms },
      acadTerms: {
        list: vi.fn().mockResolvedValue([
          { id: "2025-T3A", startDt: new Date("2026-01-01") },
          { id: "2025-T3B", startDt: new Date("2026-03-01") },
          { id: "2026-T1", startDt: new Date("2026-08-01") },
        ]),
      },
    } as unknown as ToolContext["caller"],
  };
  const res = await planSemesterTool.run(ctx, { limit, goal: "accounting" });
  expect(res.isError).toBeFalsy();
  expect(searchCoursesByTerms).toHaveBeenCalledTimes(1);
  return res.content[0]!.text;
}

describe("plan-semester fallback parity", () => {
  it.each([1, 10, 20])(
    "returns the same JSON as one search per term for limit %i",
    async (limit) => {
      const expected = await perTermReference(limit);
      const actual = await batchedTool(limit);
      expect(actual).toBe(expected);
    },
  );

  it("lists every term a course is offered in while the limit stays unmet", async () => {
    const ctxSearch = vi.fn(async (input: { acadTermIds: string[] }) =>
      input.acadTermIds.map((acadTermId) => ({
        acadTermId,
        courses:
          acadTermId === "2026-T1" ? [course(3)] : [course(3), course(4)],
      })),
    );
    const ctx: ToolContext = {
      user: fakeUser,
      caller: {
        roadmaps: { planSemester: vi.fn().mockResolvedValue(emptyPlan) },
        timetable: { searchCoursesByTerms: ctxSearch },
        acadTerms: {
          list: vi.fn().mockResolvedValue([
            { id: "2025-T3A", startDt: new Date("2026-01-01") },
            { id: "2025-T3B", startDt: new Date("2026-03-01") },
            { id: "2026-T1", startDt: new Date("2026-08-01") },
          ]),
        },
      } as unknown as ToolContext["caller"],
    };
    const res = await planSemesterTool.run(ctx, { limit: 10, goal: "x" });
    const parsed = JSON.parse(res.content[0]!.text) as {
      candidates: Array<{ courseId: string; offeredIn: string[] }>;
    };
    expect(parsed.candidates.map((c) => [c.courseId, c.offeredIn])).toEqual([
      ["c3", ["2025-T3A", "2025-T3B", "2026-T1"]],
      ["c4", ["2025-T3A", "2025-T3B"]],
    ]);
  });
});
