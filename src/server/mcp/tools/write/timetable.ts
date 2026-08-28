import { z } from "zod";

import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const visibilitySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);

const createTimetableSchema = z.object({
  acadTermId: z.string(),
  name: z.string().max(100).optional(),
});

export const createTimetableTool: McpTool<typeof createTimetableSchema> = {
  name: "create-timetable",
  description:
    "Create a new timetable for the user in an academic term. The first timetable in a term becomes active.",
  inputSchema: createTimetableSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.timetable.create(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const renameTimetableSchema = z.object({
  timetableId: z.string(),
  name: z.string().min(1).max(100),
});

export const renameTimetableTool: McpTool<typeof renameTimetableSchema> = {
  name: "rename-timetable",
  description: "Rename one of the user's timetables.",
  inputSchema: renameTimetableSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.timetable.rename(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const removeTimetableSchema = z.object({ timetableId: z.string() });

export const removeTimetableTool: McpTool<typeof removeTimetableSchema> = {
  name: "remove-timetable",
  description: "Delete one of the user's timetables.",
  inputSchema: removeTimetableSchema,
  run: async ({ caller }, { timetableId }) => {
    try {
      return jsonText(await caller.timetable.remove({ timetableId }));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const addClassToTimetableSchema = z.object({
  timetableId: z.string(),
  classId: z.string(),
});

export const addClassToTimetableTool: McpTool<typeof addClassToTimetableSchema> = {
  name: "add-class-to-timetable",
  description: "Add a class section to one of the user's timetables.",
  inputSchema: addClassToTimetableSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.timetable.addSlot(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const removeClassFromTimetableSchema = z.object({
  timetableId: z.string(),
  classId: z.string(),
});

export const removeClassFromTimetableTool: McpTool<typeof removeClassFromTimetableSchema> = {
  name: "remove-class-from-timetable",
  description: "Remove a class section from one of the user's timetables.",
  inputSchema: removeClassFromTimetableSchema,
  run: async ({ caller }, input) => {
    try {
      return jsonText(await caller.timetable.removeSlot(input));
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const setTimetableVisibilitySchema = z.object({
  timetableId: z.string(),
  visibility: visibilitySchema,
});

export const setTimetableVisibilityTool: McpTool<typeof setTimetableVisibilitySchema> = {
  name: "set-timetable-visibility",
  description:
    "Set a timetable's visibility: PRIVATE (only you), UNLISTED (shareable via link), or PUBLIC.",
  inputSchema: setTimetableVisibilitySchema,
  run: async ({ caller }, { timetableId, visibility }) => {
    try {
      return jsonText(
        await caller.sharing.setVisibility({ entity: "timetable", id: timetableId, visibility }),
      );
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
