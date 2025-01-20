import { ReviewLabelType, type Prisma } from "@prisma/client";
import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";
import { toTitleCase } from "@/common/functions";

export const getMetadataForProf = publicProcedure
  .input(
    z.object({
      slug: z.string(),
      withCourseCodes: z.string().array().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    const reviewWhereInput = {
      reviewedProfessor: { slug: input.slug },
      ...(input.withCourseCodes && {
        reviewedCourse: { code: { in: input.withCourseCodes } },
      }),
    } satisfies Prisma.ReviewsWhereInput;

    const reviewsMetadataForThisProf = await ctx.db.reviews.aggregate({
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
          SELECT l.name, count(l.id) FROM review_labels rl
            JOIN labels l ON rl.label_id = l.id
            WHERE rl.review_id IN (
              SELECT id FROM reviews
              WHERE reviewed_professor_id = (
                SELECT id FROM professors
                WHERE slug = ${input.slug}
              )
            )
            GROUP BY l.name
      */
    const reviewLabelsMetadataForThisProf = await ctx.db.reviewLabels.groupBy({
      by: ["labelId"],
      _count: {
        labelId: true,
      },
      where: {
        review: reviewWhereInput,
      },
    });
    const professorReviewLabels = await ctx.db.labels.findMany({
      where: {
        typeOf: ReviewLabelType.PROFESSOR,
      },
    });

    return {
      averageRating: reviewsMetadataForThisProf._avg.rating ?? 0,
      reviewCount: reviewsMetadataForThisProf._count._all,
      reviewLabels: professorReviewLabels.sort().map((label) => ({
        name: toTitleCase(label.name.replaceAll("_", " ")),
        count:
          reviewLabelsMetadataForThisProf.find((rl) => rl.labelId === label.id)
            ?._count.labelId ?? 0,
      })),
    };
  });
