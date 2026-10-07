import { z } from "zod";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma/client";
import { getCurrentAcadTerm, type AcadTermSummary } from "@/common/tools/acad-term";
import {
  countDaysInclusive,
  isWithinTerm,
  toIsoDate,
} from "@/common/functions/term-date-bounds";
import { meetingLinksSchema } from "@/modules/meetings/functions/meeting-links";
import {
  MAX_AGENDA_LENGTH,
  MAX_MEETING_PARTICIPANTS,
  MAX_POLL_DAYS,
  MAX_POLL_SLOTS,
} from "@/modules/meetings/functions/meeting-limits";

export const POLLS_PER_HOUR = 10;

export const createPollInput = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(500).nullish(),
    agenda: z.string().max(MAX_AGENDA_LENGTH).nullish(),
    links: meetingLinksSchema.default([]),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    startHour: z.number().int().min(0).max(23).default(8),
    endHour: z.number().int().min(1).max(24).default(22),
    courseId: z.uuid().nullish(),
    section: z.string().min(1).max(10).nullish(),
    teamIdentifier: z.string().max(50).nullish(),
  })
  .refine((input) => Boolean(input.courseId) === Boolean(input.section), {
    message: "Course and section must be provided together",
    path: ["section"],
  });

export type CreatePollInput = z.infer<typeof createPollInput>;

export async function requireCurrentTerm(db: PrismaClient): Promise<AcadTermSummary> {
  const term = await getCurrentAcadTerm(db);
  if (!term) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "There is no current academic term to schedule a meeting in",
    });
  }
  return term;
}

export function assertValidWindow(input: CreatePollInput, term: AcadTermSummary) {
  const range = { start: input.startDate, end: input.endDate };

  if (range.start > range.end) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start date must be before or equal to end date",
    });
  }
  if (countDaysInclusive(range) > MAX_POLL_DAYS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Date range cannot exceed ${MAX_POLL_DAYS} days`,
    });
  }
  if (!isWithinTerm(range, term)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Dates must fall within the current term (${term.label})`,
    });
  }
  if (input.startHour >= input.endHour) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Start hour must be earlier than end hour",
    });
  }
}

/**
 * Rejects a user who would become the poll's 11th participant. Users already
 * in the poll always pass so they can keep editing their availability.
 */
export async function assertParticipantCapacity(
  db: PrismaClient,
  pollId: string,
  userId: string,
): Promise<void> {
  const existing = await db.meetingParticipant.findUnique({
    where: { pollId_userId: { pollId, userId } },
    select: { id: true },
  });
  if (existing) return;

  const count = await db.meetingParticipant.count({ where: { pollId } });
  if (count >= MAX_MEETING_PARTICIPANTS) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This meeting is full (max ${MAX_MEETING_PARTICIPANTS} participants)`,
    });
  }
}

export const slotListSchema = z
  .array(z.number().int().min(0).max(MAX_POLL_SLOTS))
  .max(MAX_POLL_SLOTS);

export function calculateTotalSlots(poll: {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  startHour?: number | null;
  endHour?: number | null;
  slotDurationMinutes?: number | null;
}): number {
  if (!poll.startDate || !poll.endDate) return MAX_POLL_SLOTS;
  const days = countDaysInclusive({
    start: toIsoDate(poll.startDate),
    end: toIsoDate(poll.endDate),
  });
  const startHour = poll.startHour ?? 8;
  const endHour = poll.endHour ?? 22;
  const slotMinutes = poll.slotDurationMinutes ?? 15;
  const slotsPerHour = 60 / slotMinutes;
  const slotsPerDay = (endHour - startHour) * slotsPerHour;
  return days * slotsPerDay;
}
