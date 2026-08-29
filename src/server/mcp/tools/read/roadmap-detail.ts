import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getMyRoadmapSchema = z.object({
  roadmapId: z.string().describe("Roadmap id from my-roadmaps"),
});

export const getMyRoadmapTool: McpTool<typeof getMyRoadmapSchema> = {
  name: "get-my-roadmap",
  description:
    "Get one of the user's own roadmaps with ALL its course entries (yearNumber, term T1|T2|T3A|T3B, course code/name/credit units). Use this to see your own progression before planning.",
  inputSchema: getMyRoadmapSchema,
  readOnly: true,
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
  run: async ({ caller }, { roadmapId }) => {
    try {
      return jsonText(await caller.roadmaps.getById({ id: roadmapId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
