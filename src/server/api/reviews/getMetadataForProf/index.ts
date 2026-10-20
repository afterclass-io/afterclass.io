import { type Prisma } from "@/generated/prisma/client";
import { ReviewType } from "@/generated/prisma/enums";
import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { getReviewMetadataSummary } from "../metadata";

export const getMetadataForProf = dataProcedure("reviews")
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

    return getReviewMetadataSummary(
      ctx.db,
      reviewWhereInput,
      ReviewType.PROFESSOR,
    );
  });
