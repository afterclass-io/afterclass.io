import { type Prisma } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 10;

export const PUBLIC_COURSE_FIELDS = {
  id: true,
  name: true,
  code: true,
  description: true,
  creditUnits: true,
  // SIS prereq info (added by migration
  // 20250213090323_add_course_area_and_enrolment_requirements):
  // `enrolmentRequirements` is the canonical raw prereq string
  // (e.g. "Pre-Requisite: EITHER COR-IS1702 OR ..."); `courseArea` the
  // degree-area tags. Both nullable; omitted when the course has none.
  courseArea: true,
  enrolmentRequirements: true,
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
