import { type Prisma } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 10;

export const PROFESSOR_FIELDS = {
  id: true,
  name: true,
  email: true,
  slug: true,
  photoUrl: true,
  profileUrl: true,
  belongToUniversityId: true,
  belongToUniversity: {
    select: {
      id: true,
      name: true,
      abbrv: true,
      siteUrl: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfessorsSelect;
