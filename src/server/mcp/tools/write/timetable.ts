import { z } from "zod";

import { stripSecretsFromValue } from "@/mcp/output-policy";
import { pickActiveOrFirst, resolveTermId } from "../../current";
import {
  confirmField,
  errText,
  guardedRun,
  jsonText,
  type McpTool,
  type RouterOutputs,
} from "../../types";

const visibilitySchema = z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]);

// No confirmField here: constructive writes are never confirm-gated — only
// the Tier-1 destructive set (see src/mcp/rate-limit.ts) is.
const createTimetableSchema = z.object({
  acadTermId: z.string().optional(),
  name: z.string().max(100).optional(),
});

export const createTimetableTool: McpTool<typeof createTimetableSchema> = {
  name: "create-timetable",
  description:
    "Create a new timetable for the user in an academic term. The first timetable in a term becomes active.",
  inputSchema: createTimetableSchema,
  run: guardedRun(async ({ caller }, input) => {
    const term = await resolveTermId(caller, input.acadTermId);
    if (!term.ok) return errText(term.errText);
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(
      stripSecretsFromValue(
        await caller.timetable.create({ ...input, acadTermId: term.value }),
      ),
    );
  }),
};

const renameTimetableSchema = z.object({
  timetableId: z.string(),
  name: z.string().min(1).max(100),
});

export const renameTimetableTool: McpTool<typeof renameTimetableSchema> = {
  name: "rename-timetable",
  description: "Rename one of the user's timetables.",
  inputSchema: renameTimetableSchema,
  run: guardedRun(async ({ caller }, input) => {
    // Canonical output policy: bearer tokens must not reach the LLM.
    return jsonText(
      stripSecretsFromValue(await caller.timetable.rename(input)),
    );
  }),
};

const removeTimetableSchema = z.object({
  timetableId: z.string(),
  ...confirmField,
});

export const removeTimetableTool: McpTool<typeof removeTimetableSchema> = {
  name: "remove-timetable",
  description: "Delete one of the user's timetables.",
  inputSchema: removeTimetableSchema,
  run: guardedRun(async ({ caller }, { timetableId }) => {
    return jsonText(await caller.timetable.remove({ timetableId }));
  }),
};

const addClassToTimetableSchema = z.object({
  timetableId: z
    .string()
    .optional()
    .describe(
      "Optional: the id of one of the user's timetables (from my-timetables). Omit to add to the active timetable for the class's term automatically.",
    ),
  classId: z.string(),
});

export const addClassToTimetableTool: McpTool<
  typeof addClassToTimetableSchema
> = {
  name: "add-class-to-timetable",
  description:
    "Add a class section to one of the user's timetables. Omit timetableId to add to the active timetable for the class's academic term (created automatically when none exists).",
  inputSchema: addClassToTimetableSchema,
  run: guardedRun(async ({ caller }, input) => {
    if (input.timetableId?.trim()) {
      // Canonical output policy: bearer tokens must not reach the LLM.
      return jsonText(
        stripSecretsFromValue(
          await caller.timetable.addSlot({
            timetableId: input.timetableId.trim(),
            classId: input.classId,
          }),
        ),
      );
    }
    // Resolve the class's term, then the user's active timetable for it.
    let acadTermId: string | undefined;
    try {
      const classes: RouterOutputs["classes"]["getAll"] =
        await caller.classes.getAll({
          id: input.classId,
          limit: 1,
        });
      acadTermId = classes?.[0]?.acadTermId;
    } catch {
      acadTermId = undefined;
    }
    if (!acadTermId) {
      return errText(
        `Could not find class ${input.classId}. Ask the user to pick one of their timetables (from my-timetables) and try again with an explicit timetableId.`,
      );
    }
    const mine = (await caller.timetable.listMine({ acadTermId })) as Array<{
      id: string;
      isActive: boolean;
    }>;
    const active = pickActiveOrFirst(mine);
    let timetableId = active?.id;
    if (!timetableId) {
      const created = (await caller.timetable.create({ acadTermId })) as {
        id: string;
      };
      timetableId = created.id;
    }
    if (!timetableId) {
      return errText(
        `Could not resolve a timetable for academic term ${acadTermId}. Ask the user to pick one of their timetables (from my-timetables) and try again with an explicit timetableId.`,
      );
    }
    return jsonText(
      stripSecretsFromValue(
        await caller.timetable.addSlot({
          timetableId,
          classId: input.classId,
        }),
      ),
    );
  }),
};

const removeClassFromTimetableSchema = z.object({
  timetableId: z.string(),
  classId: z.string(),
  ...confirmField,
});

export const removeClassFromTimetableTool: McpTool<
  typeof removeClassFromTimetableSchema
> = {
  name: "remove-class-from-timetable",
  description: "Remove a class section from one of the user's timetables.",
  inputSchema: removeClassFromTimetableSchema,
  run: guardedRun(async ({ caller }, input) => {
    return jsonText(await caller.timetable.removeSlot(input));
  }),
};

const setTimetableVisibilitySchema = z.object({
  timetableId: z.string(),
  visibility: visibilitySchema,
  ...confirmField,
});

export const setTimetableVisibilityTool: McpTool<
  typeof setTimetableVisibilitySchema
> = {
  name: "set-timetable-visibility",
  description:
    "Set a timetable's visibility: PRIVATE (only you), UNLISTED (shareable via link), or PUBLIC.",
  inputSchema: setTimetableVisibilitySchema,
  run: guardedRun(async ({ caller }, { timetableId, visibility }) => {
    const res = (await caller.sharing.setVisibility({
      entity: "timetable",
      id: timetableId,
      visibility,
    })) as Record<string, unknown>;
    // Canonical output policy: bearer tokens must not reach the LLM.
    // `stripSecretsFromValue` covers shareToken + icalToken (setVisibility
    // can return both for timetables); the legacy per-row strip inner call
    // is dropped — the canonical strip subsumes it.
    return jsonText(stripSecretsFromValue(res));
  }),
};
