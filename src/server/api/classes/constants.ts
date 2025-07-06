import { type Prisma } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 10;

export const PUBLIC_CLASS_FIELDS = {
  id: true,
  section: true,
  courseId: true,
  professorId: true,
  acadTermId: true,
  createdAt: true,
  updatedAt: true,
  gradingBasis: true,
  courseOutlineUrl: true,
  bossId: true,
  course: {
    select: {
      code: true,
      name: true,
    },
  },
  classTimings: {
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      venue: true,
    },
  },
  classExamTimings: {
    select: {
      dayOfWeek: true,
      date: true,
      startTime: true,
      endTime: true,
    },
  },
  professor: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.ClassesSelect;
