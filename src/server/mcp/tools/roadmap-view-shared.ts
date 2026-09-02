import type { RouterCaller } from "../types";

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
  entries: RoadmapEntryView[];
}

function toRoadmapViewPropsShared(
  data: Record<string, unknown>,
  isPublic: boolean,
): RoadmapView {
  const roadmap = (data.roadmap ?? data) as Record<string, unknown>;
  const rawEntries = Array.isArray(data.entries)
    ? (data.entries as unknown[])
    : Array.isArray((roadmap).entries)
      ? ((roadmap).entries as unknown[])
      : [];
  const entries: RoadmapEntryView[] = rawEntries.map((e) => {
    const entry = e as Record<string, unknown>;
    const course = (entry.course ?? {}) as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    const yearNumber = entry.yearNumber as number;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    const term = entry.term as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    const courseCode = course.code as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    const courseName = course.name as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    const creditUnits = course.creditUnits as number | null;
    return { yearNumber, term, courseCode, courseName, creditUnits };
  });
  return {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    roadmapId: roadmap.id as string,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- untyped JSON
    name: roadmap.name as string,
    isPublic,
    owner: isPublic ? (data.ownerUsername as string | null) : null,
    voteCount: isPublic ? (data.voteCount as number | null) : null,
    entries,
  };
}

/** Fetch the normalized roadmap view for one roadmap owned by the caller. */
export async function buildRoadmapView(
  caller: RouterCaller,
  roadmapId: string,
): Promise<Record<string, unknown>> {
  const data = (await caller.roadmaps.getMine({ roadmapId })) as unknown as Record<
    string,
    unknown
  >;
  const roadmapSrc = data.roadmap as Record<string, unknown> | undefined;
  const roadmapRest: Record<string, unknown> = roadmapSrc ? { ...roadmapSrc } : {};
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- deliberate PII stripping
  delete roadmapRest.shareToken;
  return { roadmap: roadmapRest, entries: data.entries };
}

/** Shared toWidgetProps for any tool whose JSON text is a roadmap view. */
export function roadmapViewToWidgetProps(
  isPublic: boolean,
): (result: { content: Array<{ type: "text"; text: string }> }) => Record<string, unknown> {
  return (result) => {
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access -- untyped JSON
      const payload =
        data && typeof data === "object" && "roadmapView" in data
          ? (data.roadmapView as Record<string, unknown>)
          : data && typeof data === "object" && "roadmap" in data
            ? (data)
            : (data);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps return typed as Record
      return toRoadmapViewPropsShared(payload, isPublic) as unknown as Record<string, unknown>;
    } catch {
      return { raw: text };
    }
  };
}

export function toRoadmapViewProps(
  data: Record<string, unknown>,
  isPublic: boolean,
): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- keeps return typed as Record
  return toRoadmapViewPropsShared(data, isPublic) as unknown as Record<string, unknown>;
}
