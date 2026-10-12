import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { protectedProcedure } from "@/server/api/trpc";
import { arrangedClassSelect } from "@/server/api/timetable/arrangement-select";

const TIMETABLE_DETAIL_SELECT = {
  id: true,
  name: true,
  isActive: true,
  acadTermId: true,
  slots: {
    select: {
      class: {
        select: arrangedClassSelect,
      },
    },
  },
} satisfies Prisma.UserTimetableSelect;

type TimetableDetailRow = Prisma.UserTimetableGetPayload<{
  select: typeof TIMETABLE_DETAIL_SELECT;
}>;

function mapTimetableDetail(timetable: TimetableDetailRow) {
  const slots = timetable.slots.flatMap((slot) =>
    slot.class.classTimings.map((timing) => ({
      classId: slot.class.id,
      courseId: slot.class.course.id,
      courseCode: slot.class.course.code,
      courseName: slot.class.course.name,
      section: slot.class.section,
      day: timing.dayOfWeek,
      dayOfWeek: timing.dayOfWeek,
      startTime: timing.startTime,
      endTime: timing.endTime,
      venue: timing.venue,
      professor: slot.class.professor?.name ?? null,
      creditUnits: slot.class.course.creditUnits,
    })),
  );

  const examTimings = timetable.slots.flatMap((slot) =>
    slot.class.classExamTimings.map((exam) => ({
      classId: slot.class.id,
      courseId: slot.class.course.id,
      courseCode: slot.class.course.code,
      section: slot.class.section,
      date: exam.date instanceof Date ? exam.date.toISOString() : exam.date,
      dayOfWeek: exam.dayOfWeek,
      startTime: exam.startTime,
      endTime: exam.endTime,
      venue: exam.venue,
    })),
  );

  return {
    timetableId: timetable.id,
    name: timetable.name,
    isActive: timetable.isActive,
    acadTermId: timetable.acadTermId,
    slots,
    examTimings,
  };
}

export const getMyTimetableDetail = protectedProcedure
  .input(
    z
      .object({
        acadTermId: z.string().nullish(),
        timetableId: z.string().nullish(),
      })
      .optional(),
  )
  .query(async ({ ctx, input }) => {
    const timetableId = input?.timetableId ?? undefined;
    const acadTermId = input?.acadTermId ?? undefined;
    const userId = ctx.session.user.id;
    const select = TIMETABLE_DETAIL_SELECT;

    let userTimetable: TimetableDetailRow | null;

    if (timetableId) {
      userTimetable = await ctx.db.userTimetable.findUnique({
        where: { id: timetableId, userId },
        select,
      });
    } else if (acadTermId) {
      userTimetable = await ctx.db.userTimetable.findFirst({
        where: { userId, acadTermId, isActive: true },
        select,
      });
      userTimetable ??= await ctx.db.userTimetable.findFirst({
        where: { userId, acadTermId },
        orderBy: { createdAt: "asc" },
        select,
      });
    } else {
      userTimetable = await ctx.db.userTimetable.findFirst({
        where: { userId, isActive: true },
        select,
      });
    }

    return userTimetable ? mapTimetableDetail(userTimetable) : null;
  });
