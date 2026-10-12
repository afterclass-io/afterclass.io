import type { Prisma } from "@/generated/prisma/client";

/** Class fields shared by the arrangement and timetable-detail queries. */
export const arrangedClassSelect = {
  id: true,
  section: true,
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      creditUnits: true,
    },
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
} satisfies Prisma.ClassesSelect;
