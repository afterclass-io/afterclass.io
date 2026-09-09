import { z } from "zod";

import { pickActiveOrFirst } from "../../current";
import { stripSecretsFromValue } from "@/mcp/output-policy";
import {
  buildRoadmapView,
  roadmapViewToViewProps,
} from "../roadmap-view-shared";
import {
  errText,
  errorMessage,
  jsonText,
  type McpTool,
  type RouterOutputs,
} from "../../types";

const roadmapViewExtractor = roadmapViewToViewProps;

const getMyRoadmapSchema = z.object({
  roadmapId: z
    .string()
    .optional()
    .describe("Roadmap id from my-roadmaps. Omit to use your active roadmap."),
});

export const getMyRoadmapTool: McpTool<typeof getMyRoadmapSchema> = {
  name: "get-my-roadmap",
  description:
    "Get one of the user's own roadmaps with ALL its course entries (yearNumber, term T1|T2|T3A|T3B, course code/name/credit units, status taken|planned). Entries in roadmap terms before the user's current position (from the roadmap's matriculation term) are marked taken — treat the active roadmap as the historical source of truth for 'have I taken X?'. Later terms are planned. Use this to see your own progression before planning.",
  inputSchema: getMyRoadmapSchema,
  readOnly: true,
  toViewProps: roadmapViewExtractor(false),
  run: async ({ caller }, { roadmapId }) => {
    try {
      let resolvedId = roadmapId?.trim() ?? "";
      if (!resolvedId) {
        const mine: RouterOutputs["roadmaps"]["listMine"] =
          await caller.roadmaps.listMine();
        const active = pickActiveOrFirst(mine);
        if (!active) {
          return errText(
            "You don't have any roadmaps yet. Create one first, then ask again.",
          );
        }
        resolvedId = active.id;
      }
      const view = await buildRoadmapView(caller, resolvedId);
      // Direct viewProps writers (Task 11): no JSON round-trip — the view
      // channel carries the typed view; the text envelope stays for the model.
      return { ...jsonText(view), viewProps: view };
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
  toViewProps: roadmapViewExtractor(true),
  run: async ({ caller }, { roadmapId }) => {
    try {
      // Canonical output policy: bearer tokens must not reach the LLM
      // (public payloads can still carry the owner's shareToken).
      return jsonText(
        stripSecretsFromValue(await caller.roadmaps.getById({ id: roadmapId })),
      );
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
