import type { UniversityAbbreviation } from "@/generated/prisma/enums";

export type SearchCourseResult = {
  uniAbbrv: UniversityAbbreviation;
  courseCode: string;
  courseName: string;
  profCount: number;
  reviewCount: number;
};

export type SearchProfResult = {
  uniAbbrv: UniversityAbbreviation;
  profName: string;
  profSlug: string;
  courseCount: number;
  reviewCount: number;
};
