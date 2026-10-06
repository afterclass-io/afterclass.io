import { z } from "zod";

import {
  availabilityToRanges,
  rangeToSlotIndices,
  slotIndexToTime,
  SlotTimeError,
  toPollGrid,
} from "@/modules/meetings/functions/slot-time";
import { db } from "@/server/db";
import { errText, errorMessage, jsonText, type McpTool } from "../../types";
import { absoluteUrl, meetingPage } from "../page-links";

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
          where: {
            code: { equals: input.courseCode.trim(), mode: "insensitive" },
          },
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
        url: absoluteUrl(meetingPage(res.slug)),
        message: `Meeting poll "${input.title}" created successfully. Share the link ${absoluteUrl(meetingPage(res.slug))} with participants to collect availability.`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/);

const submitMeetingAvailabilitySchema = z.object({
  slug: z
    .string()
    .min(6)
    .max(20)
    .describe("The meeting poll slug (from /meetings/[slug])"),
  availability: z
    .array(
      z.object({
        date: isoDate.describe(
          "Day in YYYY-MM-DD (SGT), inside the poll window",
        ),
        start: hhmm.describe("Start time HH:MM (SGT) on the poll's slot grid"),
        end: hhmm.describe(
          "End time HH:MM (SGT), after start, on the slot grid",
        ),
        status: z
          .enum(["available", "ifNeeded", "unavailable"])
          .optional()
          .describe(
            '"available" (default), "ifNeeded", or "unavailable" (mode merge only: removes these times from the user\'s availability)',
          ),
      }),
    )
    .max(200)
    .describe(
      "Time ranges the user can attend. With mode replace, an empty list clears the user's availability",
    ),
  mode: z
    .enum(["replace", "merge"])
    .optional()
    .describe(
      '"replace" (default) overwrites all of the user\'s availability; "merge" adds these ranges to it',
    ),
});

export const submitMeetingAvailabilityTool: McpTool<
  typeof submitMeetingAvailabilitySchema
> = {
  name: "submit-meeting-availability",
  description:
    'Submit the signed-in user\'s availability for a meeting poll as Singapore-time date/time ranges on the poll\'s slot grid. mode "replace" (default) overwrites all of the user\'s availability; "merge" adds these ranges to what the user already has, and the new status wins where ranges overlap; in merge mode a range with status "unavailable" removes those times. Read the poll window with get-meeting-poll-detail first.',
  inputSchema: submitMeetingAvailabilitySchema,
  run: async ({ caller }, input) => {
    try {
      const detail = await caller.meetings.getPollBySlug({ slug: input.slug });
      const grid = toPollGrid(detail.poll);
      const mode = input.mode ?? "replace";

      if (
        mode === "replace" &&
        input.availability.some((r) => r.status === "unavailable")
      ) {
        throw new Error(
          'status "unavailable" only applies with mode "merge"; in replace mode leave those times out.',
        );
      }

      const newSlots = new Map<
        number,
        "available" | "ifNeeded" | "unavailable"
      >();
      for (const range of input.availability) {
        const status = range.status ?? "available";
        const indices = rangeToSlotIndices(grid, range);
        for (const idx of indices) {
          const existing = newSlots.get(idx);
          if (existing !== undefined && existing !== status) {
            const { date, start } = slotIndexToTime(grid, idx);
            throw new SlotTimeError(
              `${date} ${start} is given conflicting statuses.`,
            );
          }
          newSlots.set(idx, status);
        }
      }

      const slotMap = new Map<number, "available" | "ifNeeded">();
      if (mode === "merge") {
        const currentUser = detail.participants.find((p) => p.isCurrentUser);
        if (currentUser) {
          for (const s of currentUser.ifNeededSlots) {
            slotMap.set(s, "ifNeeded");
          }
          for (const s of currentUser.availableSlots) {
            slotMap.set(s, "available");
          }
        }
      }

      for (const [slot, status] of newSlots) {
        if (status === "unavailable") {
          slotMap.delete(slot);
        } else {
          slotMap.set(slot, status);
        }
      }

      const availableSlots: number[] = [];
      const ifNeededSlots: number[] = [];
      for (const [slot, status] of slotMap) {
        if (status === "available") {
          availableSlots.push(slot);
        } else if (status === "ifNeeded") {
          ifNeededSlots.push(slot);
        }
      }
      availableSlots.sort((a, b) => a - b);
      ifNeededSlots.sort((a, b) => a - b);

      const res = await caller.meetings.submitAvailability({
        slug: input.slug,
        availableSlots,
        ifNeededSlots,
      });

      const ranges = availabilityToRanges(grid, {
        availableSlots,
        ifNeededSlots,
      });

      return jsonText({
        success: res.success,
        slug: input.slug,
        mode,
        availability: ranges,
        url: absoluteUrl(meetingPage(input.slug)),
        message: `Availability saved for ${absoluteUrl(meetingPage(input.slug))} (${mode}, ${ranges.length} ranges).`,
      });
    } catch (e) {
      return errText(errorMessage(e));
    }
  },
};
