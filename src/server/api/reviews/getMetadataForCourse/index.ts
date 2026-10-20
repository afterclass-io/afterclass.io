import { type Prisma } from "@/generated/prisma/client";
import { ReviewType } from "@/generated/prisma/enums";
import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { getReviewMetadataSummary } from "../metadata";

export const getMetadataForCourse = dataProcedure("reviews")
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

    return getReviewMetadataSummary(
      ctx.db,
      reviewWhereInput,
      ReviewType.COURSE,
    );
  });
