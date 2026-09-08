import { z } from "zod";

import {
  normalizeAcadTermId,
  parseBidWindowAlias,
  resolveClassIdByCodeSection,
  resolveLatestWindowIdOrError,
  resolveOpenWindowIdOrError,
} from "../../current";
import {
  errText,
  errorMessage,
  jsonText,
  type CourseRow,
  type McpTool,
  type RouterCaller,
  type RouterOutputs,
} from "../../types";
import {
  DEFAULT_BEATS_PERCENTAGE,
  findSafetyFactor,
  rationaleFor,
  suggestBidAmount,
} from "../bid-shared";

const bidEstimateSchema = z.object({
  courseCode: z
    .string()
    .min(1)
    .describe("Course code, e.g. COR-IS1702 or ACCT102"),
  section: z
    .string()
    .optional()
    .describe(
      "Optional section, e.g. G1; omit to estimate all sections of the course",
    ),
  acadTermId: z
    .string()
    .optional()
    .describe(
      "Optional academic term id; omit to use the open window's term. When no window is open, estimates fall back to the latest window for this term.",
    ),
  bidWindow: z
    .string()
    .optional()
    .describe(
      "Optional explicit bid window: a window id (e.g. 77) or an alias like r2aw3 / R2W3 / 'round 2 window 3'. Wins over the open/latest fallback.",
    ),
});

export const bidEstimateTool: McpTool<typeof bidEstimateSchema> = {
  name: "bid-estimate",
  description:
    "Estimate bid prices for a course's sections for the upcoming bidding window. Provide a course code (e.g. COR-IS1702); optionally filter to a single section (e.g. G1). Returns per-section median and minimum clearing prices from the latest bid predictions, a suggested bid amount (median × safety multiplier for 70% confidence when available, never below e$10), and the current vacancy for the resolved window. Window resolution: explicit bidWindow > open window > latest window (estimates then use prior-window results — immediate-next-window only). If the course or its sections are not found, explains what was tried. Self-contained: one call is the answer. For an interactive chart/table/slider the user can play with, prefer explore-bid-options (it accepts courseCode+section); use this tool for text answers or multi-section comparison.",
  inputSchema: bidEstimateSchema,
  readOnly: true,
  run: async (
    { caller },
    {
      courseCode,
      section,
      acadTermId: acadTermInput,
      bidWindow: bidWindowInput,
    },
  ) => {
    try {
      const trimmedCode = courseCode.trim();
      if (!trimmedCode) return errText("courseCode must not be empty");

      // Fallback chain (read-only estimate path only): explicit window id >
      // open window > latest window for the term (or latest overall).
      const resolved = await resolveEstimateWindow(caller, {
        bidWindowInput,
        termInput: acadTermInput,
      });
      if (!resolved.ok) return errText(resolved.errText);
      const { window: bidWindow, warnings } = resolved.value;
      const warning = warnings[0];
      const openWindowId = bidWindow?.id;
      if (openWindowId == null)
        return errText("Could not resolve a bid window for this estimate.");

      // Resolve course (canonical code/name)
      const course: CourseRow = await caller.courses.getByCourseCode({
        code: trimmedCode,
      });
      if (!course || typeof course.code !== "string")
        return errText(`Course ${trimmedCode} not found`);

      const acadTermId = bidWindow?.acadTermId;
      // Fetch classes for the course in the (open) term.
      const rawClasses: RouterOutputs["classes"]["getAll"] =
        await caller.classes.getAll({
          courseCode: course.code,
          acadTermId: acadTermId ?? undefined,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentionally maps "" -> undefined
          section: section?.trim() || undefined,
          limit: 50,
        });

      let classes = rawClasses ?? [];
      // If a section filter was given, ensure exact match (getAll does exact, but be defensive).
      const sectionFilter = section?.trim();
      if (sectionFilter) {
        const filtered = classes.filter((c) => c.section === sectionFilter);
        // If getAll already filtered, this is no-op; if it returned empty due to term mismatch,
        // try without acadTermId as a fallback.
        if (filtered.length === 0 && classes.length === 0 && acadTermId) {
          const fallbackId = await resolveClassIdByCodeSection(caller, {
            courseCode: course.code,
            section: sectionFilter,
          });
          if (fallbackId) {
            const matched: typeof rawClasses = await caller.classes.getAll({
              courseCode: course.code,
              section: sectionFilter,
              limit: 50,
            });
            classes = (matched ?? []).filter(
              (c) => c.section === sectionFilter,
            );
          } else {
            classes = [];
          }
        } else {
          classes = filtered;
        }
      } else if (classes.length === 0 && acadTermId) {
        // Term-scoped lookup returned nothing (e.g. course not in that term);
        // try a term-agnostic lookup so the user still gets an estimate.
        const fallback: typeof rawClasses = await caller.classes.getAll({
          courseCode: course.code,
          limit: 50,
        });
        classes = fallback ?? [];
      }

      if (classes.length === 0) {
        return jsonText({
          courseCode: course.code,
          courseName: course.name,
          bidWindow,
          estimates: [],
          note:
            sectionFilter != null
              ? `No sections found for ${course.code} section ${sectionFilter} in term ${acadTermId ?? "current"}.`
              : `No sections found for ${course.code} in term ${acadTermId ?? "current"}.`,
        });
      }

      // Safety factors for suggested amount (median × multiplier for 70%).
      let safetyFactors: Array<{
        acadTermId: string;
        predictionType: string;
        beatsPercentage: number;
        multiplier: number;
      }> = [];
      try {
        safetyFactors = await caller.safetyFactors.getAll();
      } catch {
        // leave empty -> multiplier 1.0
      }

      const estimates: Array<Record<string, unknown>> = [];
      for (const cls of classes) {
        let prediction: RouterOutputs["bidPredictions"]["getBy"] = null;
        try {
          prediction = await caller.bidPredictions.getBy({
            classId: cls.id,
          });
        } catch {
          prediction = null;
        }

        const median = prediction?.medianPredicted ?? null;
        const min = prediction?.minPredicted ?? null;
        let suggested: number | null = suggestBidAmount(median);
        let multiplierUsed: number | null = null;
        let rationale: string | null = null;
        if (median !== null && bidWindow) {
          const factor = findSafetyFactor(
            safetyFactors,
            bidWindow.acadTermId,
            DEFAULT_BEATS_PERCENTAGE,
          );
          if (factor) {
            suggested = suggestBidAmount(median, factor.multiplier);
            multiplierUsed = factor.multiplier;
            rationale = rationaleFor(
              median,
              factor.multiplier,
              DEFAULT_BEATS_PERCENTAGE,
            );
          } else {
            rationale = rationaleFor(
              median,
              null,
              DEFAULT_BEATS_PERCENTAGE,
              bidWindow.acadTermId,
            );
          }
        } else if (median !== null) {
          rationale = `Predicted median ${median}; no open window context for safety multiplier.`;
        }

        // Vacancy for the OPEN window: look up BidResult for this class filtered to the open window.
        let vacancy: number | null = null;
        try {
          const results: RouterOutputs["bidResults"]["getBy"] =
            await caller.bidResults.getBy({
              classId: cls.id,
            });
          if (Array.isArray(results)) {
            const row = results.find(
              (r) =>
                r.bidWindowId === openWindowId ||
                r.bidWindow?.id === openWindowId,
            );
            if (row) vacancy = row.vacancy ?? null;
          }
        } catch {
          // leave vacancy null
        }

        estimates.push({
          section: cls.section,
          classId: cls.id,
          professorName: cls.professor?.name ?? null,
          professorSlug: cls.professor?.slug ?? null,
          medianPredicted: median,
          minPredicted: min,
          suggestedBidAmount: suggested,
          multiplierUsed,
          rationale,
          vacancy,
          bidWindow,
        });
      }

      // Sort by section for determinism
      estimates.sort((a, b) =>
        String(a.section).localeCompare(String(b.section)),
      );

      return jsonText({
        courseCode: course.code,
        courseName: course.name,
        bidWindow,
        ...(warning ? { warning } : {}),
        estimates,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

type WindowDetails = {
  id: number;
  acadTermId: string;
  round: string;
  window: number;
};

export type EstimateWindowResult =
  | { ok: true; value: { window: WindowDetails; warnings: string[] } }
  | { ok: false; errText: string };

/**
 * Resolve the bid window for an estimate (explicit id/alias > open window >
 * latest window), collapsing the getCurrentWindow() calls into one place.
 * Returns the window plus any user-facing warnings (e.g. prior-window
 * fallback); errors are friendly errText strings, never throws.
 */
export async function resolveEstimateWindow(
  caller: RouterCaller,
  opts: { bidWindowInput?: string; termInput?: string },
): Promise<EstimateWindowResult> {
  const fail = (errTextMsg: string): EstimateWindowResult => ({
    ok: false,
    errText: errTextMsg,
  });
  const trimmedWindowInput = opts.bidWindowInput?.trim() ?? "";
  const trimmedTermInput = normalizeAcadTermId(opts.termInput ?? "");
  // One fetch, reused across every branch below.
  const current = (await caller.bidWindows
    .getCurrentWindow()
    .catch(() => null)) as
    (WindowDetails & { opensAt?: unknown; resultsAt?: unknown }) | null;

  if (trimmedWindowInput) {
    const asId = Number(trimmedWindowInput);
    if (Number.isInteger(asId)) {
      const windows = trimmedTermInput
        ? await caller.bidWindows.getByAcadTerm({
            acadTermId: trimmedTermInput,
          })
        : null;
      const match = windows?.find((w: WindowDetails) => w.id === asId) ?? null;
      if (!match && windows) {
        return fail(
          `Bid window ${asId} not found in term ${trimmedTermInput}. Call get-bid-windows and let the user pick.`,
        );
      }
      if (match) {
        return { ok: true, value: { window: match, warnings: [] } };
      }
      if (current?.id !== asId) {
        return fail(
          `Bid window ${asId} not found. Call get-bid-windows and let the user pick.`,
        );
      }
      return { ok: true, value: { window: current, warnings: [] } };
    }
    const alias = parseBidWindowAlias(trimmedWindowInput);
    if (!alias) {
      return fail(
        `Could not parse bid window "${trimmedWindowInput}". Use a window id (e.g. 77) or an alias like r2aw3 / R2W3 / "round 2 window 3".`,
      );
    }
    const termForAlias = trimmedTermInput || current?.acadTermId;
    if (!termForAlias) {
      return fail(
        "Could not resolve the academic term for that window alias. Ask the user which term to use, or call get-bid-windows and let the user pick.",
      );
    }
    const windows = await caller.bidWindows.getByAcadTerm({
      acadTermId: termForAlias,
    });
    const match =
      windows.find(
        (w: WindowDetails) =>
          String(w.round).toUpperCase() === alias.round &&
          w.window === alias.window,
      ) ?? null;
    if (!match) {
      return fail(
        `No round ${alias.round} window ${alias.window} in term ${termForAlias}. Call get-bid-windows and let the user pick.`,
      );
    }
    return { ok: true, value: { window: match, warnings: [] } };
  }

  const openRes = await resolveOpenWindowIdOrError(caller);
  if (openRes.ok) {
    if (current?.id === openRes.value) {
      return { ok: true, value: { window: current, warnings: [] } };
    }
    return {
      ok: true,
      value: {
        window: { id: openRes.value, acadTermId: "", round: "", window: 0 },
        warnings: [],
      },
    };
  }
  const latestRes = await resolveLatestWindowIdOrError(
    caller,
    trimmedTermInput || undefined,
  );
  if (!latestRes.ok) return fail(latestRes.errText);
  const windows = trimmedTermInput
    ? await caller.bidWindows.getByAcadTerm({ acadTermId: trimmedTermInput })
    : null;
  const match =
    windows?.find((w: WindowDetails) => w.id === latestRes.value) ?? null;
  const window =
    match ??
    (current?.id === latestRes.value
      ? current
      : {
          id: latestRes.value,
          acadTermId: trimmedTermInput,
          round: "",
          window: 0,
        });
  return {
    ok: true,
    value: {
      window,
      warnings: [
        "No bid window is currently open — estimates use prior-window results; immediate-next-window only.",
      ],
    },
  };
}
