import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

/** Flat entry shape consumed by the roadmap-view widget. */
interface RoadmapEntryView {
  yearNumber: number;
  term: string;
  courseCode: string;
  courseName: string;
  creditUnits: number | null;
}

/**
 * Normalize either tool's JSON text output into the shared RoadmapViewProps.
 * getMine emits { roadmap, entries }; getById emits { roadmap, entries,
 * ownerUsername, ownerFaculty, voteCount, viewerHasVoted }. Both nest the
 * course as entry.course.{code,name,creditUnits}.
 */
function toRoadmapViewProps(
  data: Record<string, unknown>,
  isPublic: boolean,
): Record<string, unknown> {
  const roadmap = (data.roadmap ?? {}) as Record<string, unknown>;
  const rawEntries = Array.isArray(data.entries) ? data.entries : [];
  const entries: RoadmapEntryView[] = rawEntries.map((e) => {
    const entry = e as Record<string, unknown>;
    const course = (entry.course ?? {}) as Record<string, unknown>;
    return {
      yearNumber: (entry.yearNumber as number) ?? 0,
      term: (entry.term as string) ?? "",
      courseCode: (course.code as string) ?? "",
      courseName: (course.name as string) ?? "",
      creditUnits: (course.creditUnits as number | null) ?? null,
    };
  });
  return {
    roadmapId: (roadmap.id as string) ?? "",
    name: (roadmap.name as string) ?? "",
    isPublic,
    owner: isPublic ? ((data.ownerUsername as string | null) ?? null) : null,
    voteCount: isPublic ? ((data.voteCount as number | null) ?? null) : null,
    entries,
  };
}

/** Shared toWidgetProps: parse the tool's JSON text back into widget props. */
const roadmapViewWidgetProps =
  (isPublic: boolean) =>
  (result: { content: Array<{ type: "text"; text: string }> }) => {
    const text = result.content.find((c) => c.type === "text")?.text ?? "";
    try {
      const data = JSON.parse(text) as Record<string, unknown>;
      return toRoadmapViewProps(data, isPublic);
    } catch {
      return { raw: text };
    }
  };

const getMyRoadmapSchema = z.object({
  roadmapId: z.string().describe("Roadmap id from my-roadmaps"),
});

export const getMyRoadmapTool: McpTool<typeof getMyRoadmapSchema> = {
  name: "get-my-roadmap",
  description:
    "Get one of the user's own roadmaps with ALL its course entries (yearNumber, term T1|T2|T3A|T3B, course code/name/credit units). Use this to see your own progression before planning.",
  inputSchema: getMyRoadmapSchema,
  readOnly: true,
  widgetName: "roadmap-view",
  toWidgetProps: roadmapViewWidgetProps(false),
  run: async ({ caller }, { roadmapId }) => {
    try {
      const data = (await caller.roadmaps.getMine({ roadmapId })) as {
        roadmap: Record<string, unknown>;
        entries: unknown;
      };
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- shareToken must not reach the LLM
      const { shareToken: _s, ...roadmapRest } = data.roadmap as Record<string, unknown> & {
        shareToken?: unknown;
      };
      return jsonText({ roadmap: roadmapRest, entries: data.entries });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getPublicRoadmapSchema = z.object({
  roadmapId: z.string().describe("Roadmap id from browse-public-roadmaps"),
});

export const getPublicRoadmapTool: McpTool<typeof getPublicRoadmapSchema> = {
  name: "get-public-roadmap",
  description:
    "Get a public roadmap with ALL its course entries (yearNumber, term, course code/name/credit units) plus the owner and vote count. Use this to study a senior's full progression.",
  inputSchema: getPublicRoadmapSchema,
  readOnly: true,
  widgetName: "roadmap-view",
  toWidgetProps: roadmapViewWidgetProps(true),
  run: async ({ caller }, { roadmapId }) => {
    try {
      return jsonText(await caller.roadmaps.getById({ id: roadmapId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
