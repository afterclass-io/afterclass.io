import { z } from "zod";

import {
  buildRoadmapView,
  roadmapViewToViewProps,
} from "../roadmap-view-shared";
import { stripSecretsFromValue } from "@/mcp/output-policy";
import { guardedRun, jsonText, type McpTool } from "../../types";

// No schema in this file carries confirmField: constructive writes are never
// confirm-gated — only the Tier-1 destructive set (see src/mcp/rate-limit.ts) is.
const setMatricTermSchema = z.object({
  roadmapId: z.string(),
  matricTermId: z
    .string()
    .nullable()
    .describe(
      "Academic term id of the user's Y1T1 (see list-acad-terms). Pass null to clear the declaration.",
    ),
});

export const setMatricTermTool: McpTool<typeof setMatricTermSchema> = {
  name: "set-matric-term",
  description:
    "Set the matriculation term (the academic term of the user's Y1T1) on a roadmap. Required for accurate plan-semester seniority and for sync-roadmap-progress to work. Pass matricTermId: null to clear it.",
  inputSchema: setMatricTermSchema,
  run: guardedRun(async ({ caller }, { roadmapId, matricTermId }) => {
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(
      stripSecretsFromValue(
        await caller.roadmaps.setMatricTerm({ roadmapId, matricTermId }),
      ),
    );
  }),
};

const setActiveRoadmapSchema = z.object({
  roadmapId: z.string(),
});

export const setActiveRoadmapTool: McpTool<typeof setActiveRoadmapSchema> = {
  name: "set-active-roadmap",
  description:
    "Mark a roadmap as the user's single active roadmap (clears isActive on all the user's other roadmaps). Use before sync-roadmap-progress and plan-semester so those tools operate on the intended roadmap.",
  inputSchema: setActiveRoadmapSchema,
  run: guardedRun(async ({ caller }, { roadmapId }) => {
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(
      stripSecretsFromValue(await caller.roadmaps.setActive({ roadmapId })),
    );
  }),
};

const syncRoadmapProgressSchema = z.object({
  roadmapId: z.string(),
});

export const syncRoadmapProgressTool: McpTool<
  typeof syncRoadmapProgressSchema
> = {
  name: "sync-roadmap-progress",
  description:
    "Sync the user's course history into a roadmap: for every academic term from the roadmap's matriculation term up to the current term, courses from the user's active timetable for that term are added to the matching roadmap year/term. Add-only - never deletes or duplicates courses. Requires the roadmap to be active and to have a matriculation term (see set-matric-term). Returns { synced, courseIds }.",
  inputSchema: syncRoadmapProgressSchema,
  run: guardedRun(async ({ caller }, { roadmapId }) => {
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(
      stripSecretsFromValue(await caller.roadmaps.syncProgress({ roadmapId })),
    );
  }),
};

const copyPublicRoadmapSchema = z.object({
  roadmapId: z.string(),
});

export const copyPublicRoadmapTool: McpTool<typeof copyPublicRoadmapSchema> = {
  name: "copy-public-roadmap",
  description:
    "Copy a public roadmap (from browse-public-roadmaps or get-public-roadmap) into the user's own account as '<name> (copy)'. Use when a student wants to adopt a senior's plan as a starting point. Returns the updated roadmap.",
  inputSchema: copyPublicRoadmapSchema,
  toViewProps: roadmapViewToViewProps(false),
  run: guardedRun(async ({ caller }, { roadmapId }) => {
    const created = await caller.roadmaps.copyPublic({ roadmapId });
    const view = await buildRoadmapView(caller, created.id);
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(stripSecretsFromValue(view));
  }),
};
