import { type Prisma } from "@prisma/client";

export const DEFAULT_PAGE_SIZE = 10;

export const PUBLIC_REVIEW_FIELDS = {
  id: true,
  rating: true,
  countEventViews: true,
  createdAt: true,
  reviewedUniversityId: true,
  reviewedProfessorId: true,
  reviewedCourseId: true,
  reviewedCourse: {
    select: {
      code: true,
      name: true,
    },
  },
  reviewer: {
    select: {
      username: true,
    },
  },
  reviewLabels: {
    include: {
      label: {
        select: {
          name: true,
        },
      },
    },
  },
  reviewedProfessor: {
    select: {
      name: true,
      slug: true,
    },
  },
  reviewedUniversity: {
    select: {
      abbrv: true,
    },
  },
  countVotes: true,
} satisfies Prisma.ReviewsSelect;

export const PRIVATE_REVIEW_FIELDS = {
  ...PUBLIC_REVIEW_FIELDS,
  body: true,
  tips: true,
  rating: true,
} satisfies Prisma.ReviewsSelect;
