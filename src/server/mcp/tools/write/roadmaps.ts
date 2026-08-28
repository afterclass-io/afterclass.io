import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const termSchema = z.enum(["T1", "T2", "T3A", "T3B"]);
const visibilitySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);

const roadmapEntrySchema = z.object({
  courseId: z.string(),
  yearNumber: z.number().int().min(1).max(8),
  term: termSchema,
  sortOrder: z.number().int().min(0).max(99),
});

const createRoadmapSchema = z.object({ name: z.string().min(1).max(100) });

export const createRoadmapTool: McpTool<typeof createRoadmapSchema> = {
  name: "create-roadmap",
  description: "Create a new study roadmap for the user.",
  inputSchema: createRoadmapSchema,
  run: async ({ caller }, { name }) => {
    try {
      return jsonText(await caller.roadmaps.create({ name }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const renameRoadmapSchema = z.object({
  roadmapId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const renameRoadmapTool: McpTool<typeof renameRoadmapSchema> = {
  name: "rename-roadmap",
  description: "Rename a roadmap (and optionally update its description).",
  inputSchema: renameRoadmapSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.roadmaps.rename(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const removeRoadmapSchema = z.object({ roadmapId: z.string() });

export const removeRoadmapTool: McpTool<typeof removeRoadmapSchema> = {
  name: "remove-roadmap",
  description: "Delete one of the user's roadmaps.",
  inputSchema: removeRoadmapSchema,
  run: async ({ caller }, { roadmapId }) => {
    try {
      return jsonText(await caller.roadmaps.remove({ roadmapId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const saveRoadmapEntriesSchema = z.object({
  roadmapId: z.string(),
  entries: z.array(roadmapEntrySchema).max(100),
});

export const saveRoadmapEntriesTool: McpTool<typeof saveRoadmapEntriesSchema> = {
  name: "save-roadmap-entries",
  description:
    "Replace the course entries of a roadmap. entries is the full desired list: [{courseId, yearNumber (1-8), term (T1|T2|T3A|T3B), sortOrder}].",
  inputSchema: saveRoadmapEntriesSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.roadmaps.saveEntries(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const setRoadmapVisibilitySchema = z.object({
  roadmapId: z.string(),
  visibility: visibilitySchema,
});

export const setRoadmapVisibilityTool: McpTool<typeof setRoadmapVisibilitySchema> = {
  name: "set-roadmap-visibility",
  description:
    "Set a roadmap's visibility - the single visibility tool. PRIVATE (only you; removes it from the public gallery), UNLISTED (shareable via link), or PUBLIC (publishes to the public gallery; requires a verified account).",
  inputSchema: setRoadmapVisibilitySchema,
  run: async ({ caller }, { roadmapId, visibility }) => {
    try {
      return jsonText(
        await caller.sharing.setVisibility({ entity: "roadmap", id: roadmapId, visibility }),
      );
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
