import { z } from "zod";

import { stripSecretsFromValue } from "@/mcp/output-policy";
import {
  NO_ROADMAPS_MESSAGE,
  buildRoadmapView,
  resolveRoadmapId,
  roadmapViewToViewProps,
  toRoadmapViewPropsShared,
} from "../roadmap-view-shared";
import { errText, guardedRun, jsonText, type McpTool } from "../../types";

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
  run: guardedRun(async ({ caller }, { roadmapId }) => {
    const resolvedId = await resolveRoadmapId(caller, roadmapId?.trim() ?? "");
    if (resolvedId === null) return errText(NO_ROADMAPS_MESSAGE);
    const view = await buildRoadmapView(caller, resolvedId);
    const normalized = toRoadmapViewPropsShared(
      view,
      false,
      view.position as { yearNumber: number; term: string } | null,
    );
    // No JSON round-trip — the view channel carries the typed view; the
    // text envelope stays for the model.
    return {
      ...jsonText(normalized),
      viewProps: normalized as unknown as Record<string, unknown>,
    };
  }),
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
  run: guardedRun(async ({ caller }, { roadmapId }) => {
    // Canonical output policy: bearer tokens must not reach the LLM
    // (public payloads can still carry the owner's shareToken).
    return jsonText(
      stripSecretsFromValue(await caller.roadmaps.getById({ id: roadmapId })),
    );
  }),
};
