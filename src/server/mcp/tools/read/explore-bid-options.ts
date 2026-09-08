import { z } from "zod";

import { resolveClassIdByCodeSection } from "../../current";
import {
  errText,
  errorMessage,
  jsonText,
  parseViewJson,
  type McpTool,
  type RouterOutputs,
} from "../../types";

/** Flat history shape consumed by the bid-explorer view. */
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
 *
 * At most one row per term+round+window is emitted: duplicates collapse to the
 * lowest min/median (mirrors `buildChartPoints` grouping in
 * views/bid-explorer/view.tsx). The vacancy follows the row that set the
 * lowest min (first such row wins ties).
 */
function normalizeHistory(results: BidResultRow[]): HistoryPoint[] {
  const grouped = new Map<string, HistoryPoint>();
  for (const r of results) {
    if (r.min === null || r.median === null) continue;
    const key = `${r.bidWindow.acadTermId}/${r.bidWindow.round}/${r.bidWindow.window}`;
    const existing = grouped.get(key);
    if (existing) {
      if (
        r.min < existing.min ||
        (r.min === existing.min && r.median < existing.median)
      ) {
        existing.vacancy = r.vacancy ?? null;
      }
      existing.min = Math.min(existing.min, r.min);
      existing.median = Math.min(existing.median, r.median);
    } else {
      grouped.set(key, {
        acadTermId: r.bidWindow.acadTermId,
        round: r.bidWindow.round,
        window: r.bidWindow.window,
        min: r.min,
        median: r.median,
        vacancy: r.vacancy ?? null,
      });
    }
  }
  return [...grouped.values()].sort(
    (a, b) =>
      a.acadTermId.localeCompare(b.acadTermId) ||
      a.round.localeCompare(b.round, undefined, { numeric: true }) ||
      a.window - b.window,
  );
}

const exploreBidOptionsSchema = z
  .object({
    classId: z
      .string()
      .optional()
      .describe("Class id; obtain from get-classes"),
    courseCode: z
      .string()
      .optional()
      .describe("Course code, e.g. COR-MGMT1202"),
    professorSlug: z
      .string()
      .optional()
      .describe("Professor slug; obtain from get-professor"),
    section: z
      .string()
      .optional()
      .describe("Section, e.g. G1; combine with courseCode"),
  })
  .refine(
    (v) => v.classId ?? (v.courseCode && (v.professorSlug ?? v.section)),
    {
      message:
        "Provide classId, or courseCode + professorSlug, or courseCode + section",
    },
  );

export const exploreBidOptionsTool: McpTool<typeof exploreBidOptionsSchema> = {
  name: "explore-bid-options",
  description:
    "Explore bid prices for a class, course+professor, or course+section combination: historical clearing ranges per term/round, the latest prediction, and safety multipliers (what amount beats X% of bids). Use for interactive section-level bidding questions ('how much for COR-IS1702 G1?') — pass courseCode+section. Use when the user wants to compare options and decide a bid themselves rather than get a single recommendation.",
  inputSchema: exploreBidOptionsSchema,
  readOnly: true,
  toViewProps: (result) => {
    const parsed = parseViewJson(result);
    return "data" in parsed ? parsed.data : { raw: parsed.raw };
  },
  run: async ({ caller }, { classId, courseCode, professorSlug, section }) => {
    try {
      let results;
      let resolvedClassId: string | null = classId ?? null;
      if (resolvedClassId) {
        results = await caller.bidResults.getBy({ classId: resolvedClassId });
      } else if (section && !professorSlug) {
        // courseCode + section path: resolve the classId via the shared
        // code+section resolver (term-scoped, term-agnostic fallback).
        if (!courseCode?.trim()) return errText("courseCode must not be empty");
        const trimmedCode = courseCode.trim();
        const trimmedSection = section.trim();
        if (!trimmedCode) return errText("courseCode must not be empty");
        if (!trimmedSection) return errText("section must not be empty");
        let termId: string | undefined;
        try {
          const cw: RouterOutputs["bidWindows"]["getCurrentWindow"] =
            await caller.bidWindows.getCurrentWindow();
          termId = cw?.acadTermId ?? undefined;
        } catch {
          // leave termId undefined — the lookup below searches broadly
        }
        resolvedClassId = await resolveClassIdByCodeSection(caller, {
          courseCode: trimmedCode,
          section: trimmedSection,
          termId,
        });
        if (!resolvedClassId) {
          return errText(
            `Class for ${trimmedCode} section ${trimmedSection} not found${termId ? ` in term ${termId}` : ""}.`,
          );
        }
        results = await caller.bidResults.getBy({ classId: resolvedClassId });
      } else {
        // getByCourseProfessor keys on professorId, so resolve the slug first.
        if (!professorSlug?.trim())
          return errText("professorSlug must not be empty");
        if (!courseCode?.trim()) return errText("courseCode must not be empty");
        const professor = await caller.professors.getBySlug({
          slug: professorSlug.trim(),
        });
        if (!professor) return errText(`Professor ${professorSlug} not found.`);
        results = await caller.bidResults.getByCourseProfessor({
          courseCode: courseCode.trim(),
          professorId: professor.id,
        });
      }
      // A prediction is per-class; without a resolved classId there is none.
      const prediction = resolvedClassId
        ? await caller.bidPredictions.getBy({ classId: resolvedClassId })
        : null;
      const history = normalizeHistory(results);
      if (history.length === 0 && !prediction?.bidWindow) {
        return errText("No bid data available for this combination yet.");
      }
      let safetyFactors: Array<{
        beatsPercentage: number;
        multiplier: number;
      }> = [];
      if (prediction?.bidWindow) {
        const factors = await caller.safetyFactors.getAll();
        safetyFactors = factors
          .filter(
            (f) =>
              f.acadTermId === prediction.bidWindow.acadTermId &&
              f.predictionType === "MEDIAN",
          )
          .map((f) => ({
            beatsPercentage: f.beatsPercentage,
            multiplier: f.multiplier,
          }))
          .sort((a, b) => a.beatsPercentage - b.beatsPercentage);
      }
      return jsonText({
        classId: resolvedClassId,
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
