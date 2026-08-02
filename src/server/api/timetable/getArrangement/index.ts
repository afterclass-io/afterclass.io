import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const getArrangement = protectedProcedure
  .input(z.object({ timetableId: z.string() }))
  .query(async ({ ctx, input }) => {
    const userTimetable = await ctx.db.userTimetable.findUnique({
      where: { id: input.timetableId, userId: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        slots: {
          select: {
            class: {
              select: {
                id: true,
                section: true,
                course: {
                  select: { id: true, code: true, name: true, creditUnits: true },
                },
                professor: {
                  select: { id: true, name: true },
                },
                classTimings: {
                  select: {
                    id: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                  },
                },
                classExamTimings: {
                  select: {
                    id: true,
                    date: true,
                    dayOfWeek: true,
                    startTime: true,
                    endTime: true,
                    venue: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userTimetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const slots = userTimetable.slots.map((slot) => ({
      classId: slot.class.id,
      courseCode: slot.class.course.code,
      courseName: slot.class.course.name,
      section: slot.class.section,
      professorName: slot.class.professor?.name ?? null,
      creditUnits: slot.class.course.creditUnits,
      timings: slot.class.classTimings,
      examTimings: slot.class.classExamTimings,
    }));

    return { timetable: { id: userTimetable.id, name: userTimetable.name }, slots };
  });
