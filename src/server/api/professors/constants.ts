import { type Prisma } from "@/generated/prisma/client";

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
