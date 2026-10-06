import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";

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

    let userTimetable = null;

    if (timetableId) {
      userTimetable = await ctx.db.userTimetable.findUnique({
        where: { id: timetableId, userId: ctx.session.user.id },
        select: {
          id: true,
          name: true,
          isActive: true,
          acadTermId: true,
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
    } else if (acadTermId) {
      userTimetable = await ctx.db.userTimetable.findFirst({
        where: { userId: ctx.session.user.id, acadTermId, isActive: true },
        select: {
          id: true,
          name: true,
          isActive: true,
          acadTermId: true,
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

      userTimetable ??= await ctx.db.userTimetable.findFirst({
          where: { userId: ctx.session.user.id, acadTermId },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            isActive: true,
            acadTermId: true,
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
    } else {
      userTimetable = await ctx.db.userTimetable.findFirst({
        where: { userId: ctx.session.user.id, isActive: true },
        select: {
          id: true,
          name: true,
          isActive: true,
          acadTermId: true,
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
    }

    if (!userTimetable) {
      return null;
    }

    const flatSlots = userTimetable.slots.flatMap((slot) =>
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

    const flatExamTimings = userTimetable.slots.flatMap((slot) =>
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
      timetableId: userTimetable.id,
      name: userTimetable.name,
      isActive: userTimetable.isActive,
      acadTermId: userTimetable.acadTermId,
      slots: flatSlots,
      examTimings: flatExamTimings,
    };
  });
