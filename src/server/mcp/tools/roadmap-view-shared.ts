import type { RouterCaller, RouterOutputs } from "../types";
import { parseViewJson } from "../types";
import { stripSecretsFromValue } from "@/mcp/output-policy";
import { TERM_ORDER } from "./feasibility-check";
import { buildProgressSyncPlan } from "@/modules/roadmaps/functions/progress-sync";

export interface RoadmapEntryView {
  yearNumber: number;
  term: string;
  courseCode: string;
  courseName: string;
  creditUnits: number | null;
  /** taken = roadmap term elapsed before the current term (active roadmaps are
   *  a historical source of truth, not just future plans); planned otherwise.
   *  Absent when the position cannot be resolved (no matric term / no terms). */
  status?: "taken" | "planned";
}

export interface RoadmapView {
  roadmapId: string;
  name: string;
  isPublic: boolean;
  owner: string | null;
  voteCount: number | null;
  progress?: { completed: number; total: number };
  entries: RoadmapEntryView[];
}

/** Compare two (yearNumber, term) slots: <0 before, 0 same, >0 after. */
function compareTermSlot(
  a: { yearNumber: number; term: string },
  b: { yearNumber: number; term: string },
): number {
  return (
    a.yearNumber - b.yearNumber ||
    (TERM_ORDER[a.term] ?? 99) - (TERM_ORDER[b.term] ?? 99)
  );
}

type TermRow = {
  id: string;
  acadYearStart: number;
  term: string;
  startDt: Date;
};

/**
 * Resolve the user's current (yearNumber, term) position on a roadmap from
 * its matriculation term + the current acad term, via the same sync-plan
 * helper plan-semester uses. Null when unresolvable (no matric term, unknown
 * terms) — callers then omit per-entry status rather than guessing.
 */
function resolveCurrentPosition(
  terms: TermRow[],
  matricTermId: string,
  currentTermId: string,
): { yearNumber: number; term: string } | null {
  const plan = buildProgressSyncPlan(terms, matricTermId, currentTermId);
  const last = plan.at(-1);
  return last ? { yearNumber: last.yearNumber, term: last.term } : null;
}

function toRoadmapViewPropsShared(
  data: Record<string, unknown>,
  isPublic: boolean,
  position?: { yearNumber: number; term: string } | null,
): RoadmapView {
  const roadmap = (data.roadmap ?? data) as Record<string, unknown>;
  const rawEntries = Array.isArray(data.entries)
    ? (data.entries as unknown[])
    : Array.isArray(roadmap.entries)
      ? (roadmap.entries as unknown[])
      : [];
  const entries: RoadmapEntryView[] = [];
  // Drop malformed rows, never cast blindly — a malformed entry is
  // skipped, not surfaced as undefined props.
  for (const e of rawEntries) {
    const entry = e as Record<string, unknown>;
    const course = (entry.course ?? {}) as Record<string, unknown>;
    if (typeof entry.yearNumber !== "number" || typeof entry.term !== "string")
      continue;
    if (typeof course.code !== "string" || typeof course.name !== "string")
      continue;
    entries.push({
      yearNumber: entry.yearNumber,
      term: entry.term,
      courseCode: course.code,
      courseName: course.name,
      creditUnits:
        typeof course.creditUnits === "number" ? course.creditUnits : null,
      // Entries in strictly earlier slots than the user's current position
      // are already taken; the current + later slots are still planned.
      ...(position
        ? {
            status:
              compareTermSlot(
                { yearNumber: entry.yearNumber, term: entry.term },
                position,
              ) < 0
                ? ("taken" as const)
                : ("planned" as const),
          }
        : {}),
    });
  }
  return {
    roadmapId: roadmap.id as string,
    name: roadmap.name as string,
    isPublic,
    owner: isPublic ? (data.ownerUsername as string | null) : null,
    voteCount: isPublic ? (data.voteCount as number | null) : null,
    // Completed = entries in elapsed roadmap terms (historical truth), not
    // catalog description presence. Falls back to the description heuristic
    // only when the position is unresolvable.
    ...(entries.length > 0
      ? {
          progress: {
            completed: position
              ? entries.filter((e) => e.status === "taken").length
              : rawEntries.filter((e) => {
                  const course = ((e as Record<string, unknown>).course ??
                    {}) as Record<string, unknown>;
                  return (
                    typeof course.description === "string" &&
                    course.description.length > 0
                  );
                }).length,
            total: entries.length,
          },
        }
      : {}),
    entries,
  };
}

/** Fetch the normalized roadmap view for one roadmap owned by the caller. */
export async function buildRoadmapView(
  caller: RouterCaller,
  roadmapId: string,
): Promise<Record<string, unknown>> {
  const data: RouterOutputs["roadmaps"]["getMine"] =
    await caller.roadmaps.getMine({
      roadmapId,
    });
  const roadmapSrc = data.roadmap as Record<string, unknown> | undefined;
  // Bearer tokens must not reach the LLM. `stripSecretsFromValue` covers
  // shareToken + icalToken + notes;
  // roadmaps only carry shareToken today, but the helper keeps this
  // future-proof without a second implementation.
  const roadmapRest: Record<string, unknown> = roadmapSrc
    ? stripSecretsFromValue({ ...roadmapSrc })
    : {};
  return {
    roadmap: roadmapRest,
    entries: data.entries,
    position: await resolveRoadmapPosition(caller, roadmapRest),
  };
}

/**
 * Best-effort current position for the position-aware view: needs the
 * roadmap's matricTermId plus the acad term list + current term. Any failure
 * (no matric term, no terms, unknown ids) yields null and the view omits
 * status rather than guessing.
 */
async function resolveRoadmapPosition(
  caller: RouterCaller,
  roadmap: Record<string, unknown>,
): Promise<{ yearNumber: number; term: string } | null> {
  try {
    const matricTermId =
      typeof roadmap.matricTermId === "string" ? roadmap.matricTermId : null;
    if (!matricTermId) return null;
    const acad = (
      caller as unknown as {
        acadTerms: {
          list: () => Promise<TermRow[]>;
          current: () => Promise<{ id: string } | null>;
        };
      }
    ).acadTerms;
    const [terms, current] = await Promise.all([acad.list(), acad.current()]);
    if (!current) return null;
    return resolveCurrentPosition(
      terms.map((t) => ({ ...t, startDt: new Date(t.startDt) })),
      matricTermId,
      current.id,
    );
  } catch {
    return null;
  }
}

/** Shared toViewProps for any tool whose JSON text is a roadmap view. */
export function roadmapViewToViewProps(
  isPublic: boolean,
): (result: {
  content: Array<{ type: "text"; text: string }>;
}) => Record<string, unknown> {
  return (result) => {
    const parsed = parseViewJson(result);
    if (!("data" in parsed)) return { raw: parsed.raw };
    const data = parsed.data;
    const payload =
      data && typeof data === "object" && "roadmapView" in data
        ? (data.roadmapView as Record<string, unknown>)
        : data && typeof data === "object" && "roadmap" in data
          ? data
          : data;
    const position =
      payload && typeof payload === "object" && "position" in payload
        ? (payload.position as { yearNumber: number; term: string } | null)
        : undefined;
    return toRoadmapViewPropsShared(
      payload,
      isPublic,
      position,
    ) as unknown as Record<string, unknown>;
  };
}

export function toRoadmapViewProps(
  data: Record<string, unknown>,
  isPublic: boolean,
): Record<string, unknown> {
  return toRoadmapViewPropsShared(data, isPublic) as unknown as Record<
    string,
    unknown
  >;
}
