import { type Prisma } from "@/generated/prisma/client";
import { ReviewType } from "@/generated/prisma/enums";
import { z } from "zod";

import { dataProcedure } from "@/server/api/trpc";
import { getReviewMetadataSummary } from "../metadata";
import { reviewViewerFor } from "../viewer";

export const getMetadataForCourse = dataProcedure("reviews")
  .input(
    z.object({
      code: z.string(),
      withProfSlugs: z.string().array().optional(),
    }),
  )
  .query(async ({ ctx, input }) => {
    // Matches the feed: with `professors` private, an anonymous caller sees
    // course reviews only and cannot narrow by professor.
    const viewer = await reviewViewerFor(ctx.session);
    const courseReviewsOnly =
      viewer.kind === "public" && viewer.courseReviewsOnly === true;
    const reviewWhereInput = {
      reviewedCourse: { code: input.code },
      ...(courseReviewsOnly
        ? { reviewedProfessorId: null }
        : input.withProfSlugs && {
            reviewedProfessor: { slug: { in: input.withProfSlugs } },
          }),
    } satisfies Prisma.ReviewsWhereInput;

    return getReviewMetadataSummary(
      ctx.db,
      reviewWhereInput,
      ReviewType.COURSE,
    );
  });
