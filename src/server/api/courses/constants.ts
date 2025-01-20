import { type Prisma } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 10;

export const PUBLIC_COURSE_FIELDS = {
  id: true,
  name: true,
  code: true,
  description: true,
  creditUnits: true,
  belongToFacultyId: true,
  belongToFaculty: {
    select: {
      id: true,
      name: true,
      acronym: true,
      siteUrl: true,
    },
  },
  belongToUniversityId: true,
  belongToUniversity: {
    select: {
      id: true,
      name: true,
      abbrv: true,
      siteUrl: true,
    },
  },
} satisfies Prisma.CoursesSelect;
