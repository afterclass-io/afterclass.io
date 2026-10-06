import { z } from "zod";

import { db } from "@/server/db";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";
import { MAX_POLL_SLOTS } from "@/modules/meetings/functions/meeting-limits";

const createMeetingPollSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(120)
    .describe("Meeting title (e.g. 'CS101 Sprint 1 Sync')"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe(
      "Start date of the poll window in YYYY-MM-DD format (must fall within the current academic term)",
    ),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe(
      "End date of the poll window in YYYY-MM-DD format (at most 14 days after the start date)",
    ),
  startHour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .default(8)
    .optional()
    .describe("Starting hour of each day in SGT (0-23, default: 8)"),
  endHour: z
    .number()
    .int()
    .min(1)
    .max(24)
    .default(22)
    .optional()
    .describe("Ending hour of each day in SGT (1-24, default: 22)"),
  description: z
    .string()
    .max(500)
    .optional()
    .describe("Optional description or agenda for the meeting"),
  courseCode: z
    .string()
    .optional()
    .describe(
      "Optional course code of a class offered in the current term (e.g. 'IS215'); requires section",
    ),
  section: z
    .string()
    .max(10)
    .optional()
    .describe("Class section (e.g. 'G1'); required together with courseCode"),
  teamIdentifier: z
    .string()
    .max(50)
    .optional()
    .describe("Optional team identifier (e.g. 'Team Alpha')"),
});

export const createMeetingPollTool: McpTool<typeof createMeetingPollSchema> = {
  name: "create-meeting-poll",
  description:
    "Create a new meeting poll in the current academic term to coordinate availability with classmates.",
  inputSchema: createMeetingPollSchema,
  run: async ({ caller }, input) => {
    try {
      let courseId: string | undefined;
      if (input.courseCode?.trim()) {
        const course = await db.courses.findFirst({
          where: { code: { equals: input.courseCode.trim(), mode: "insensitive" } },
          select: { id: true },
        });
        if (!course) {
          return errText(`Course ${input.courseCode.trim()} was not found.`);
        }
        courseId = course.id;
      }

      const res = await caller.meetings.createPoll({
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        startHour: input.startHour ?? 8,
        endHour: input.endHour ?? 22,
        description: input.description,
        courseId,
        section: input.section,
        teamIdentifier: input.teamIdentifier,
      });

      return jsonText({
        id: res.id,
        slug: res.slug,
        url: `/meetings/${res.slug}`,
        message: `Meeting poll "${input.title}" created successfully. Share the link /meetings/${res.slug} with participants to collect availability.`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const submitMeetingAvailabilitySchema = z.object({
  slug: z
    .string()
    .min(1)
    .describe("The unique slug of the meeting poll (from URL /meetings/[slug])"),
  availableSlots: z
    .array(z.number().int().min(0).max(MAX_POLL_SLOTS))
    .max(MAX_POLL_SLOTS)
    .describe("Array of 15-minute slot indices where the user is fully available"),
  ifNeededSlots: z
    .array(z.number().int().min(0).max(MAX_POLL_SLOTS))
    .max(MAX_POLL_SLOTS)
    .optional()
    .describe("Optional array of 15-minute slot indices where the user is available 'if needed'"),
});

export const submitMeetingAvailabilityTool: McpTool<
  typeof submitMeetingAvailabilitySchema
> = {
  name: "submit-meeting-availability",
  description:
    "Submit or update the authenticated user's availability slots for a meeting poll.",
  inputSchema: submitMeetingAvailabilitySchema,
  run: async ({ caller }, input) => {
    try {
      const res = await caller.meetings.submitAvailability({
        slug: input.slug,
        availableSlots: input.availableSlots,
        ifNeededSlots: input.ifNeededSlots ?? [],
      });

      return jsonText({
        success: res.success,
        participantId: res.participantId,
        slug: input.slug,
        availableSlotCount: input.availableSlots.length,
        ifNeededSlotCount: input.ifNeededSlots?.length ?? 0,
        url: `/meetings/${input.slug}`,
        message: `Availability submitted successfully for /meetings/${input.slug} (${input.availableSlots.length} available slots painted).`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
