import { ReviewType } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { DEFAULT_PAGE_SIZE, PUBLIC_REVIEW_FIELDS } from "../constants";
import { getOrderBy } from "../functions";

import {
  type Review,
  ReviewsFilterFor,
  ReviewsSortBy,
} from "@/modules/reviews/types";

export const getByCourseCode = publicProcedure
  .input(
    z.object({
      cursor: z.string().nullish(),
      limit: z.number().default(DEFAULT_PAGE_SIZE),
      skip: z.number().default(0),
      code: z.string(),
      slugs: z.string().array().optional(),
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
        reviewedCourse: { code: input.code },
        reviewedProfessor: { slug: { in: input.slugs } },
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
            likeCount: review.countVotes,
            reviewLabels: review.reviewLabels.map((rl) => ({
              name: rl.label.name,
            })),
            reviewFor:
              review.reviewedCourseId && review.reviewedProfessorId
                ? ReviewType.PROFESSOR
                : ReviewType.COURSE,
            professorName: review.reviewedProfessor?.name,
            professorSlug: review.reviewedProfessor?.slug,
            university: review.reviewedUniversity.abbrv,
          }) satisfies Review,
      ),
      nextCursor,
    };
  });
