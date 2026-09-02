import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { exploreBidOptionsTool } from "./explore-bid-options";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Mirrors the REAL row shape returned by `findBidResults`
 * (src/server/api/bidResults/findBidResults.ts): `db.bidResult.findMany` with
 * `include: { bidWindow: true, class: { include: { professor, course,
 * classTimings } } }`. `min`/`median` are nullable floats in the schema.
 */
function bidRow(
  acadTermId: string,
  round: string,
  window: number,
  min: number | null,
  median: number | null,
  vacancy = 40,
) {
  return {
    bidWindowId: 1,
    classId: "cl1",
    vacancy,
    openingVacancy: 45,
    beforeProcessVacancy: 45,
    dice: null,
    afterProcessVacancy: 38,
    enrolledStudents: 35,
    median,
    min,
    bidWindow: {
      id: 1,
      acadTermId,
      round,
      window,
      opensAt: null,
      closesAt: null,
      resultsAt: null,
    },
    class: {
      professor: { name: "Prof X" },
      course: { code: "COR-MGMT1202", name: "Management" },
      classTimings: [],
    },
  };
}

const prediction = {
  id: "p1",
  classId: "cl1",
  bidWindowId: 53,
  medianPredicted: 30,
  minPredicted: 18,
  bidWindow: { id: 53, acadTermId: "t2", round: "1", window: 1 },
};

const factors = [
  // deliberately unsorted; includes rows the tool must filter out
  { acadTermId: "t2", predictionType: "MEDIAN", beatsPercentage: 90, multiplier: 1.15 },
  { acadTermId: "t2", predictionType: "MEDIAN", beatsPercentage: 50, multiplier: 1.0 },
  { acadTermId: "t1", predictionType: "MEDIAN", beatsPercentage: 70, multiplier: 9.9 },
  { acadTermId: "t2", predictionType: "MIN", beatsPercentage: 70, multiplier: 9.9 },
  { acadTermId: "t2", predictionType: "MEDIAN", beatsPercentage: 70, multiplier: 1.05 },
];

function makeCaller({
  results = [] as unknown[],
  pred = null,
  professor = null as { id: string } | null,
}: {
  results?: unknown[];
  pred?: unknown;
  professor?: { id: string } | null;
} = {}) {
  return {
    bidResults: {
      getBy: vi.fn().mockResolvedValue(results),
      getByCourseProfessor: vi.fn().mockResolvedValue(results),
    },
    bidPredictions: { getBy: vi.fn().mockResolvedValue(pred) },
    safetyFactors: { getAll: vi.fn().mockResolvedValue(factors) },
    professors: { getBySlug: vi.fn().mockResolvedValue(professor) },
  } as unknown as ToolContext["caller"];
}

function parse(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0]!.text) as {
    classId: string | null;
    history: Array<Record<string, unknown>>;
    prediction: unknown;
    safetyFactors: Array<{ beatsPercentage: number; multiplier: number }>;
  };
}

describe("explore-bid-options", () => {
  it("is read-only, exposes the bid-explorer widget, and normalizes the classId path", async () => {
    const caller = makeCaller({
      results: [
        bidRow("t2", "1", 1, 14, 28, 40),
        bidRow("t1", "1", 1, 10, 22, 45),
      ],
      pred: prediction,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: "cl1",
      courseCode: undefined,
      professorSlug: undefined,
    });

    expect(exploreBidOptionsTool.readOnly).toBe(true);
    expect(result.isError).toBeUndefined();
    expect(caller.bidResults.getBy).toHaveBeenCalledWith({ classId: "cl1" });
    expect(caller.bidPredictions.getBy).toHaveBeenCalledWith({ classId: "cl1" });
    expect(caller.safetyFactors.getAll).toHaveBeenCalledTimes(1);
    expect(caller.bidResults.getByCourseProfessor).not.toHaveBeenCalled();

    const out = parse(result);
    expect(out.classId).toBe("cl1");
    // sorted by acadTermId, then round, then window
    expect(out.history).toEqual([
      { acadTermId: "t1", round: "1", window: 1, min: 10, median: 22, vacancy: 45 },
      { acadTermId: "t2", round: "1", window: 1, min: 14, median: 28, vacancy: 40 },
    ]);
    expect(out.prediction).toEqual({
      medianPredicted: 30,
      minPredicted: 18,
      bidWindow: { id: 53, round: "1", window: 1 },
    });
    // filtered to MEDIAN + prediction's acadTermId, sorted by beatsPercentage
    expect(out.safetyFactors).toEqual([
      { beatsPercentage: 50, multiplier: 1.0 },
      { beatsPercentage: 70, multiplier: 1.05 },
      { beatsPercentage: 90, multiplier: 1.15 },
    ]);
  });

  it("uses getByCourseProfessor for courseCode + professorSlug; classId and prediction are null", async () => {
    const caller = makeCaller({
      results: [bidRow("t1", "1", 1, 10, 22)],
      professor: { id: "prof-1" },
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: undefined,
      courseCode: "COR-MGMT1202",
      professorSlug: "prof-x",
    });

    expect(result.isError).toBeUndefined();
    expect(caller.professors.getBySlug).toHaveBeenCalledWith({ slug: "prof-x" });
    expect(caller.bidResults.getByCourseProfessor).toHaveBeenCalledWith({
      courseCode: "COR-MGMT1202",
      professorId: "prof-1",
    });
    expect(caller.bidResults.getBy).not.toHaveBeenCalled();
    // per-class prediction needs classId -> never fetched
    expect(caller.bidPredictions.getBy).not.toHaveBeenCalled();

    const out = parse(result);
    expect(out.classId).toBeNull();
    expect(out.prediction).toBeNull();
    expect(out.safetyFactors).toEqual([]);
    expect(out.history).toHaveLength(1);
  });

  it("errTexts when the professor slug does not resolve", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ professor: null }) };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: undefined,
      courseCode: "COR-MGMT1202",
      professorSlug: "ghost",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("ghost");
  });

  it("errTexts when there is no history and no prediction", async () => {
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ results: [] }) };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: "cl1",
      courseCode: undefined,
      professorSlug: undefined,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("No bid data");
  });

  it("drops rows with null min/median and maps the real findBidResults shape", async () => {
    const caller = makeCaller({
      results: [
        bidRow("t1", "1", 2, null, null, 12), // no clearing prices -> dropped
        bidRow("t1", "1", 1, 5.5, 17.25, 30),
      ],
      pred: null,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: "cl1",
      courseCode: undefined,
      professorSlug: undefined,
    });
    expect(result.isError).toBeUndefined();
    const out = parse(result);
    expect(out.history).toEqual([
      { acadTermId: "t1", round: "1", window: 1, min: 5.5, median: 17.25, vacancy: 30 },
    ]);
    expect(out.prediction).toBeNull();
    expect(out.safetyFactors).toEqual([]);
  });

  it("errTexts when bidResults rejects", async () => {
    const caller = {
      bidResults: {
        getBy: vi.fn().mockRejectedValue(new Error("db down")),
        getByCourseProfessor: vi.fn(),
      },
      bidPredictions: { getBy: vi.fn() },
      safetyFactors: { getAll: vi.fn() },
      professors: { getBySlug: vi.fn() },
    } as unknown as ToolContext["caller"];
    const ctx: ToolContext = { user: fakeUser, caller };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: "cl1",
      courseCode: undefined,
      professorSlug: undefined,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("db down");
  });

  it("toWidgetProps parses its own JSON output back into widget props", async () => {
    const caller = makeCaller({
      results: [bidRow("t1", "1", 1, 10, 22)],
      pred: prediction,
    });
    const ctx: ToolContext = { user: fakeUser, caller };
    const result = await exploreBidOptionsTool.run(ctx, {
      classId: "cl1",
      courseCode: undefined,
      professorSlug: undefined,
    });
    const props = exploreBidOptionsTool.toWidgetProps?.(result);
    expect(props).toMatchObject({ classId: "cl1" });
    expect(Array.isArray((props as { history?: unknown[] }).history)).toBe(true);
  });
});
