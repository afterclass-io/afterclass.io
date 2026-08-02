import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { publicProcedure } from "@/server/api/trpc";

export const getSharedTimetable = publicProcedure
  .input(z.object({ token: z.string() }))
  .query(async ({ ctx, input }) => {
    const timetable = await ctx.db.userTimetable.findUnique({
      where: { shareToken: input.token },
      include: {
        user: {
          select: { username: true },
        },
        slots: {
          include: {
            class: {
              include: {
                course: true,
                professor: true,
                classTimings: true,
                classExamTimings: true,
              },
            },
          },
        },
      },
    });

    if (!timetable) {
      throw new TRPCError({ code: "NOT_FOUND" });
    }

    const slots = timetable.slots.map((slot) => ({
      classId: slot.class.id,
      courseCode: slot.class.course.code,
      courseName: slot.class.course.name,
      section: slot.class.section,
      professorName: slot.class.professor?.name ?? null,
      creditUnits: slot.class.course.creditUnits,
      timings: slot.class.classTimings,
      examTimings: slot.class.classExamTimings,
    }));

    return {
      timetable: {
        name: timetable.name,
        ownerUsername: timetable.user.username,
      },
      slots,
    };
  });
