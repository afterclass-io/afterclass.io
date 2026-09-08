import type { RouterCaller, RouterOutputs } from "../types";
import { parseViewJson } from "../types";
import { stripSecretsFromValue } from "@/mcp/output-policy";

export interface RoadmapEntryView {
  yearNumber: number;
  term: string;
  courseCode: string;
  courseName: string;
  creditUnits: number | null;
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

function toRoadmapViewPropsShared(
  data: Record<string, unknown>,
  isPublic: boolean,
): RoadmapView {
  const roadmap = (data.roadmap ?? data) as Record<string, unknown>;
  const rawEntries = Array.isArray(data.entries)
    ? (data.entries as unknown[])
    : Array.isArray(roadmap.entries)
      ? (roadmap.entries as unknown[])
      : [];
  const entries: RoadmapEntryView[] = [];
  // Validated entry mapping (Task 11): drop malformed rows, never cast
  // blindly — a malformed entry is skipped, not surfaced as undefined props.
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
    });
  }
  return {
    roadmapId: roadmap.id as string,
    name: roadmap.name as string,
    isPublic,
    owner: isPublic ? (data.ownerUsername as string | null) : null,
    voteCount: isPublic ? (data.voteCount as number | null) : null,
    // Honest progress signal from the existing getMine payload only (no new
    // queries): completed = entries whose course carries a non-empty
    // description (content synced), total = all entries. Omit when there are
    // no entries so the view hides the row.
    ...(entries.length > 0
      ? {
          progress: {
            completed: rawEntries.filter((e) => {
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
  // Canonical output policy (Task 7, R8): bearer tokens must not reach the
  // LLM. `stripSecretsFromValue` covers shareToken + icalToken + notes;
  // roadmaps only carry shareToken today, but the helper keeps this
  // future-proof without a second implementation.
  const roadmapRest: Record<string, unknown> = roadmapSrc
    ? stripSecretsFromValue({ ...roadmapSrc })
    : {};
  return { roadmap: roadmapRest, entries: data.entries };
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
    return toRoadmapViewPropsShared(payload, isPublic) as unknown as Record<
      string,
      unknown
    >;
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
