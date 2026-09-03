import { z } from "zod";

import { parseBidWindowAlias, resolveLatestWindowIdOrError, resolveOpenWindowIdOrError } from "../../current";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

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
    "Estimate bid prices for a course's sections for the upcoming bidding window. Provide a course code (e.g. COR-IS1702); optionally filter to a single section (e.g. G1). Returns per-section median and minimum clearing prices from the latest bid predictions, a suggested bid amount (median × safety multiplier for 70% confidence when available), and the current vacancy for the open window. If no bid window is currently open, returns a friendly message asking the user for the round and window. If the course or its sections are not found, explains what was tried. Self-contained: one call is the answer.",
  inputSchema: bidEstimateSchema,
  readOnly: true,
  run: async ({ caller }, { courseCode, section, acadTermId: acadTermInput, bidWindow: bidWindowInput }) => {
    try {
      const trimmedCode = courseCode.trim();
      if (!trimmedCode) return errText("courseCode must not be empty");

      // Fallback chain (read-only estimate path only): explicit window id >
      // open window > latest window for the term (or latest overall).
      type WindowDetails = {
        id: number;
        acadTermId: string;
        round: string;
        window: number;
      };
      let bidWindow: WindowDetails | null = null;
      let warning: string | undefined;
      const trimmedWindowInput = bidWindowInput?.trim() ?? "";
      const trimmedTermInput = acadTermInput?.trim() ?? "";
      if (trimmedWindowInput) {
        const asId = Number(trimmedWindowInput);
        if (Number.isInteger(asId)) {
          const windows = trimmedTermInput
            ? await caller.bidWindows.getByAcadTerm({ acadTermId: trimmedTermInput })
            : null;
          const match = windows?.find((w) => w.id === asId) ?? null;
          if (!match && windows) {
            return errText(
              `Bid window ${asId} not found in term ${trimmedTermInput}. Call get-bid-windows and let the user pick.`,
            );
          }
          if (match) {
            bidWindow = match as unknown as WindowDetails;
          } else {
            const current = (await caller.bidWindows.getCurrentWindow()) as unknown as WindowDetails | null;
            if (!current || current.id !== asId) {
              return errText(
                `Bid window ${asId} not found. Call get-bid-windows and let the user pick.`,
              );
            }
            bidWindow = current;
          }
        } else {
          const alias = parseBidWindowAlias(trimmedWindowInput);
          if (!alias) {
            return errText(
              `Could not parse bid window "${trimmedWindowInput}". Use a window id (e.g. 77) or an alias like r2aw3 / R2W3 / "round 2 window 3".`,
            );
          }
          const termForAlias =
            trimmedTermInput ||
            (await caller.bidWindows.getCurrentWindow().catch(() => null))?.acadTermId;
          if (!termForAlias) {
            return errText(
              "Could not resolve the academic term for that window alias. Ask the user which term to use, or call get-bid-windows and let the user pick.",
            );
          }
          const windows = await caller.bidWindows.getByAcadTerm({ acadTermId: termForAlias });
          const match =
            windows.find(
              (w) =>
                String(w.round).toUpperCase() === alias.round && w.window === alias.window,
            ) ?? null;
          if (!match) {
            return errText(
              `No round ${alias.round} window ${alias.window} in term ${termForAlias}. Call get-bid-windows and let the user pick.`,
            );
          }
          bidWindow = match as unknown as WindowDetails;
        }
      } else {
        const openRes = await resolveOpenWindowIdOrError(caller);
        if (openRes.ok) {
          try {
            const w = (await caller.bidWindows.getCurrentWindow()) as unknown as WindowDetails | null;
            if (w && w.id === openRes.value) bidWindow = w;
            else bidWindow = { id: openRes.value, acadTermId: "", round: "", window: 0 };
          } catch {
            bidWindow = { id: openRes.value, acadTermId: "", round: "", window: 0 };
          }
        } else {
          const latestRes = await resolveLatestWindowIdOrError(
            caller,
            trimmedTermInput || undefined,
          );
          if (!latestRes.ok) return errText(latestRes.errText);
          const windows = trimmedTermInput
            ? await caller.bidWindows.getByAcadTerm({ acadTermId: trimmedTermInput })
            : null;
          const match = windows?.find((w) => w.id === latestRes.value) ?? null;
          if (match) {
            bidWindow = match as unknown as WindowDetails;
          } else {
            try {
              const w = (await caller.bidWindows.getCurrentWindow()) as unknown as WindowDetails | null;
              bidWindow =
                w && w.id === latestRes.value
                  ? w
                  : { id: latestRes.value, acadTermId: trimmedTermInput, round: "", window: 0 };
            } catch {
              bidWindow = { id: latestRes.value, acadTermId: trimmedTermInput, round: "", window: 0 };
            }
          }
          warning =
            "No bid window is currently open — estimates use prior-window results; immediate-next-window only.";
        }
      }
      const openWindowId = bidWindow?.id;
      if (openWindowId == null) return errText("Could not resolve a bid window for this estimate.");

      // Resolve course (canonical code/name)
      const course = (await caller.courses.getByCourseCode({
        code: trimmedCode,
      })) as unknown as { id: string; code: string; name: string } | null;
      if (!course) return errText(`Course ${trimmedCode} not found`);

      const acadTermId = bidWindow?.acadTermId;
      // Fetch classes for the course in the (open) term.
      const rawClasses = (await caller.classes.getAll({
        courseCode: course.code,
        acadTermId: acadTermId ?? undefined,
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- intentionally maps "" -> undefined
        section: section?.trim() || undefined,
        limit: 50,
      })) as unknown as Array<{
        id: string;
        section: string;
        professor?: { name: string; slug: string } | null;
        professorId?: string | null;
      }>;

      let classes = rawClasses ?? [];
      // If a section filter was given, ensure exact match (getAll does exact, but be defensive).
      const sectionFilter = section?.trim();
      if (sectionFilter) {
        const filtered = classes.filter((c) => c.section === sectionFilter);
        // If getAll already filtered, this is no-op; if it returned empty due to term mismatch,
        // try without acadTermId as a fallback.
        if (filtered.length === 0 && classes.length === 0 && acadTermId) {
          const fallback = (await caller.classes.getAll({
            courseCode: course.code,
            section: sectionFilter,
            limit: 50,
          })) as unknown as typeof rawClasses;
          classes = (fallback ?? []).filter((c) => c.section === sectionFilter);
        } else {
          classes = filtered;
        }
      } else if (classes.length === 0 && acadTermId) {
        // Term-scoped lookup returned nothing (e.g. course not in that term);
        // try a term-agnostic lookup so the user still gets an estimate.
        const fallback = (await caller.classes.getAll({
          courseCode: course.code,
          limit: 50,
        })) as unknown as typeof rawClasses;
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
        let prediction: {
          medianPredicted: number | null;
          minPredicted: number | null;
          bidWindow: { id: number; acadTermId: string; round: string; window: number } | null;
        } | null = null;
        try {
          const rawPred = (await caller.bidPredictions.getBy({
            classId: cls.id,
          })) as unknown as typeof prediction;
          prediction = rawPred;
        } catch {
          prediction = null;
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps typed after narrowing
        const median = (prediction as unknown as { medianPredicted: number | null } | null)?.medianPredicted ?? null;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps typed after narrowing
        const min = (prediction as unknown as { minPredicted: number | null } | null)?.minPredicted ?? null;
        let suggested: number | null = median;
        let multiplierUsed: number | null = null;
        let rationale: string | null = null;
        if (median !== null && bidWindow) {
          const factor = safetyFactors.find(
            (f) =>
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- bidWindow narrowed to non-null by outer guard
              f.acadTermId === bidWindow.acadTermId &&
              f.predictionType === "MEDIAN" &&
              f.beatsPercentage === 70,
          );
          if (factor) {
            suggested = Math.round(median * factor.multiplier * 100) / 100;
            multiplierUsed = factor.multiplier;
            rationale = `Predicted median ${median} x safety multiplier ${factor.multiplier} (beats 70% of bids).`;
          } else {
            rationale = `No safety factor for beats 70% in ${bidWindow.acadTermId}; suggested = predicted median ${median} x 1.0.`;
          }
        } else if (median !== null) {
          rationale = `Predicted median ${median}; no open window context for safety multiplier.`;
        }

        // Vacancy for the OPEN window: look up BidResult for this class filtered to the open window.
        let vacancy: number | null = null;
        try {
          const results = (await caller.bidResults.getBy({
            classId: cls.id,
          })) as unknown as Array<{
            bidWindowId: number;
            vacancy: number | null;
            bidWindow?: { id: number } | null;
          }>;
          if (Array.isArray(results)) {
            const row = results.find(
              (r) => r.bidWindowId === openWindowId || r.bidWindow?.id === openWindowId,
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
      estimates.sort((a, b) => String(a.section).localeCompare(String(b.section)));

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
