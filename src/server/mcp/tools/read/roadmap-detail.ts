import { z } from "zod";

import { buildRoadmapView, roadmapViewToWidgetProps } from "../roadmap-view-shared";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const roadmapViewWidgetProps = roadmapViewToWidgetProps;

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
      return jsonText(await buildRoadmapView(caller, roadmapId));
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
