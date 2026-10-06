import { z } from "zod";

import {
  formatSgtIso,
  SGT_TIMEZONE,
  toPollGrid,
} from "@/modules/meetings/functions/slot-time";
import {
  DEFAULT_DURATION_MINUTES,
  suggestMeetingTimes,
} from "@/modules/meetings/functions/suggest-times";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";

const getMyMeetingsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .optional()
    .describe("Max number of meetings to return (default: 5, max: 20)"),
});

export const getMyMeetingsTool: McpTool<typeof getMyMeetingsSchema> = {
  name: "get-my-meetings",
  description:
    "List the group meetings and availability polls the user created or joined.",
  inputSchema: getMyMeetingsSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const meetings = await caller.meetings.listMyMeetings();
      const limit = input?.limit ?? 5;
      const limited = meetings.slice(0, limit);
      return jsonText({
        meetings: limited.map((m) => ({
          id: m.id,
          slug: m.slug,
          title: m.title,
          description: m.description,
          startDate: m.startDate,
          endDate: m.endDate,
          course: m.course ? { code: m.course.code, name: m.course.name } : null,
          section: m.section,
          teamIdentifier: m.teamIdentifier,
          participantCount: m.participantCount,
          isCreator: m.isCreator,
          url: `/meetings/${m.slug}`,
        })),
        total: meetings.length,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const getMeetingPollDetailSchema = z.object({
  slug: z.string().describe("The 10-character slug of the meeting poll"),
});

export const getMeetingPollDetailTool: McpTool<typeof getMeetingPollDetailSchema> = {
  name: "get-meeting-poll-detail",
  description:
    "Get full details, participants, and aggregate availability heatmap for a group meeting poll by its slug.",
  inputSchema: getMeetingPollDetailSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const detail = await caller.meetings.getPollBySlug({ slug: input.slug });
      return jsonText({
        poll: detail.poll,
        participantCount: detail.participants.length,
        participants: detail.participants.map((p) => ({
          participantId: p.participantId,
          name: p.name,
          availableSlotsCount: p.availableSlots.length,
          ifNeededSlotsCount: p.ifNeededSlots.length,
          isCurrentUser: p.isCurrentUser,
        })),
        url: `/meetings/${detail.poll.slug}`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/);

const suggestMeetingTimesSchema = z.object({
  slug: z
    .string()
    .min(6)
    .max(20)
    .describe("The meeting poll slug (from /meetings/[slug])"),
  durationMinutes: z
    .number()
    .int()
    .min(15)
    .max(480)
    .optional()
    .describe(
      "Meeting length in minutes; a multiple of the poll's slot size (default 60)",
    ),
  dates: z
    .array(isoDate)
    .min(1)
    .max(14)
    .optional()
    .describe(
      "Only these SGT dates (YYYY-MM-DD). Do not combine with from/to",
    ),
  from: isoDate.optional().describe("Inclusive start date (YYYY-MM-DD, SGT)"),
  to: isoDate.optional().describe("Inclusive end date (YYYY-MM-DD, SGT)"),
  daysOfWeek: z
    .array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]))
    .min(1)
    .max(7)
    .optional()
    .describe(
      'Only these weekdays. Weekend = ["sat","sun"]; weekdays = ["mon","tue","wed","thu","fri"]',
    ),
  earliestStart: hhmm
    .optional()
    .describe("Earliest start time, HH:MM SGT (e.g. evenings: 18:00)"),
  latestEnd: hhmm
    .optional()
    .describe("Latest end time, HH:MM SGT (e.g. evenings: 22:00)"),
  requireParticipants: z
    .array(z.string().min(1).max(100))
    .max(30)
    .optional()
    .describe("Participant names who must be free or if-needed"),
  includePast: z
    .boolean()
    .optional()
    .describe("Include times that already started (default false)"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Max ranked options (default 5, max 10)"),
});

export const suggestMeetingTimesTool: McpTool<
  typeof suggestMeetingTimesSchema
> = {
  name: "suggest-meeting-times",
  description:
    'Find the best meeting times in a group meeting poll and who can make each one. Use this, not get-meeting-poll-detail, to answer \'best time / when can we meet / who can make it\' questions. Pass structured filters for the window the user asked about (weekend = daysOfWeek ["sat","sun"]; evenings = earliestStart "18:00", latestEnd "22:00"). All dates and times are Singapore time. Returns ranked options plus the best option for each day.',
  inputSchema: suggestMeetingTimesSchema,
  readOnly: true,
  run: async ({ caller }, input) => {
    try {
      const now = new Date();
      const { slug, ...query } = input;
      const detail = await caller.meetings.getPollBySlug({ slug });
      const grid = toPollGrid(detail.poll);
      const result = suggestMeetingTimes({
        grid,
        participants: detail.participants,
        query,
        now,
      });
      let message: string | undefined;
      if (result.emptyReason === "all-past") {
        message =
          "Every matching time is already in the past. Pass includePast: true to see past times.";
      } else if (result.requiredUnmet) {
        message = `No time in this window works for all of: ${input.requireParticipants?.join(", ") ?? ""}. These are the closest options; see each option's unavailable list.`;
      } else if (result.nobodyCanAttend) {
        message =
          "Nobody has marked any time in this window as available or if needed; these are the earliest open times.";
      }
      return jsonText({
        poll: {
          slug: detail.poll.slug,
          title: detail.poll.title,
          timezone: SGT_TIMEZONE,
          slotMinutes: grid.slotMinutes,
        },
        asOf: formatSgtIso(now),
        participants: result.participants,
        query: {
          ...query,
          durationMinutes:
            query.durationMinutes ?? DEFAULT_DURATION_MINUTES,
        },
        options: result.options,
        bestPerDay: result.bestPerDay,
        nobodyCanAttend: result.nobodyCanAttend,
        ...(message ? { message } : {}),
        url: `/meetings/${detail.poll.slug}`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

