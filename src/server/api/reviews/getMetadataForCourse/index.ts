import { type Prisma } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { toTitleCase } from "@/common/functions";

export const getMetadataForCourse = publicProcedure
  .input(
    z.object({
      code: z.string(),
      withProfSlugs: z.string().array().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const reviewWhereInput = {
      reviewedCourse: { code: input.code },
      ...(input.withProfSlugs && {
        reviewedProfessor: { slug: { in: input.withProfSlugs } },
      }),
    } satisfies Prisma.ReviewsWhereInput;

    const reviewsMetadataForThisCourse = await ctx.db.reviews.aggregate({
      where: reviewWhereInput,
      _avg: {
        rating: true,
      },
      _count: {
        _all: true,
      },
    });

    // alternative to prisma query, we can use:
    /*
          SELECT l.name, count(l.id) FROM labels l
            JOIN review_labels rl ON rl.label_id = l.id
            WHERE rl.review_id IN (
              SELECT id FROM reviews
              WHERE reviewed_course_id  = (
                SELECT id FROM courses
                WHERE code = ${input.code}
              )
            )
            GROUP BY l.name
      */
    const reviewLabelsMetadataForThisCourse = await ctx.db.reviewLabels.groupBy(
      {
        by: ["labelId"],
        _count: {
          labelId: true,
        },
        where: {
          review: reviewWhereInput,
        },
      },
    );

    const courseReviewLabels = await ctx.db.labels.findMany({
      where: {
        typeOf: "COURSE",
      },
    });

    return {
      averageRating: reviewsMetadataForThisCourse._avg.rating ?? 0,
      reviewCount: reviewsMetadataForThisCourse._count._all,
      reviewLabels: courseReviewLabels.sort().map((label) => ({
        name: toTitleCase(label.name.replaceAll("_", " ")),
        count:
          reviewLabelsMetadataForThisCourse.find(
            (rl) => rl.labelId === label.id,
          )?._count.labelId ?? 0,
      })),
    };
  });
