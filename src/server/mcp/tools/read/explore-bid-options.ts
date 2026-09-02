import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

/** Flat history shape consumed by the bid-explorer widget. */
interface HistoryPoint {
  acadTermId: string;
  round: string;
  window: number;
  min: number;
  median: number;
  vacancy: number | null;
}

/**
 * Minimal structural slice of a `findBidResults` row
 * (src/server/api/bidResults/findBidResults.ts): `db.bidResult.findMany` with
 * `include: { bidWindow: true, class: ... }`. Only the fields the tool reads
 * are declared; `min`/`median` are nullable floats in the Prisma schema.
 */
interface BidResultRow {
  vacancy: number | null;
  min: number | null;
  median: number | null;
  bidWindow: { acadTermId: string; round: string; window: number };
}

/**
 * Map real bid-result rows into `HistoryPoint[]`, dropping rows without
 * clearing prices (min/median are null until results are released) and sorting
 * ascending by acadTermId, then round, then window.
 */
function normalizeHistory(results: BidResultRow[]): HistoryPoint[] {
  return results
    .filter((r) => r.min !== null && r.median !== null)
    .map((r) => ({
      acadTermId: r.bidWindow.acadTermId,
      round: r.bidWindow.round,
      window: r.bidWindow.window,
      min: r.min!,
      median: r.median!,
      vacancy: r.vacancy ?? null,
    }))
    .sort(
      (a, b) =>
        a.acadTermId.localeCompare(b.acadTermId) ||
        a.round.localeCompare(b.round, undefined, { numeric: true }) ||
        a.window - b.window,
    );
}

const exploreBidOptionsSchema = z
  .object({
    classId: z.string().optional().describe("Class id; obtain from get-classes"),
    courseCode: z.string().optional().describe("Course code, e.g. COR-MGMT1202"),
    professorSlug: z.string().optional().describe("Professor slug; obtain from get-professor"),
  })
  .refine((v) => v.classId ?? (v.courseCode && v.professorSlug), {
    message: "Provide classId, or courseCode + professorSlug",
  });

export const exploreBidOptionsTool: McpTool<typeof exploreBidOptionsSchema> = {
  name: "explore-bid-options",
  description:
    "Explore bid prices for a class or course+professor combination: historical clearing ranges per term/round, the latest prediction, and safety multipliers (what amount beats X% of bids). Use when the user wants to compare options and decide a bid themselves rather than get a single recommendation.",
  inputSchema: exploreBidOptionsSchema,
  readOnly: true,
  toWidgetProps: (result) => {
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  },
  run: async ({ caller }, { classId, courseCode, professorSlug }) => {
    try {
      let results;
      if (classId) {
        results = await caller.bidResults.getBy({ classId });
      } else {
        // getByCourseProfessor keys on professorId, so resolve the slug first.
        const professor = await caller.professors.getBySlug({ slug: professorSlug! });
        if (!professor) return errText(`Professor ${professorSlug} not found.`);
        results = await caller.bidResults.getByCourseProfessor({
          courseCode: courseCode!,
          professorId: professor.id,
        });
      }
      // A prediction is per-class; without a classId there is none.
      const prediction = classId ? await caller.bidPredictions.getBy({ classId }) : null;
      const history = normalizeHistory(results);
      if (history.length === 0 && !prediction?.bidWindow) {
        return errText("No bid data available for this combination yet.");
      }
      let safetyFactors: Array<{ beatsPercentage: number; multiplier: number }> = [];
      if (prediction?.bidWindow) {
        const factors = await caller.safetyFactors.getAll();
        safetyFactors = factors
          .filter(
            (f) =>
              f.acadTermId === prediction.bidWindow.acadTermId &&
              f.predictionType === "MEDIAN",
          )
          .map((f) => ({ beatsPercentage: f.beatsPercentage, multiplier: f.multiplier }))
          .sort((a, b) => a.beatsPercentage - b.beatsPercentage);
      }
      return jsonText({
        classId: classId ?? null,
        history,
        prediction: prediction?.bidWindow
          ? {
              medianPredicted: prediction.medianPredicted,
              minPredicted: prediction.minPredicted ?? null,
              bidWindow: {
                id: prediction.bidWindow.id,
                round: prediction.bidWindow.round,
                window: prediction.bidWindow.window,
              },
            }
          : null,
        safetyFactors,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
