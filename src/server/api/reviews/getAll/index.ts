import { ReviewLabelType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { DEFAULT_PAGE_SIZE, PUBLIC_REVIEW_FIELDS } from "../constants";
import { getOrderBy } from "../functions";

import {
  type Review,
  ReviewsFilterFor,
  ReviewsSortBy,
} from "@/modules/reviews/types";

export const getAll = publicProcedure
  .input(
    z.object({
      cursor: z.string().nullish(),
      limit: z.number().default(DEFAULT_PAGE_SIZE),
      skip: z.number().default(0),
      universityId: z.number().optional(),
      courseId: z.string().optional(),
      profId: z.string().optional(),
      filterFor: z.nativeEnum(ReviewsFilterFor),
      sortBy: z.nativeEnum(ReviewsSortBy),
    }),
  )
  .query(async ({ ctx, input }) => {
    const reviews = await ctx.db.reviews.findMany({
      skip: input.skip,
      take: input.limit + 1,
      cursor: input.cursor ? { id: input.cursor } : undefined,
      where: {
        reviewedUniversityId: input.universityId,
        reviewedCourseId: input.courseId,
        reviewedProfessorId: input.profId,
      },
      orderBy: getOrderBy(input.sortBy),
      select: PUBLIC_REVIEW_FIELDS,
    });
    let nextCursor: typeof input.cursor | undefined = undefined;
    if (reviews.length > input.limit) {
      const nextItem = reviews.pop(); // return the last item from the array
      nextCursor = nextItem?.id;
    }
    return {
      items: reviews.map(
        (review) =>
          ({
            ...review,
            body: "",
            tips: "",
            rating: 0,
            createdAt: review.createdAt.getTime(),
            courseCode: review.reviewedCourse.code,
            courseName: review.reviewedCourse.name,
            username: review.reviewer.username ?? "Anonymous",
            reviewLabels: review.reviewLabels.map((rl) => ({
              name: rl.label.name,
            })),
            likeCount: review.countVotes,
            reviewFor:
              review.reviewedCourseId && review.reviewedProfessorId
                ? ReviewLabelType.PROFESSOR
                : ReviewLabelType.COURSE,
            professorName: review.reviewedProfessor?.name,
            professorSlug: review.reviewedProfessor?.slug,
            university: review.reviewedUniversity.abbrv,
          }) satisfies Review,
      ),
      nextCursor,
    };
  });
