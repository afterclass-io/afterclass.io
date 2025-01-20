import { TRPCError } from "@trpc/server";
import { ReviewLabelType } from "@prisma/client";
import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { PRIVATE_REVIEW_FIELDS } from "@/server/api/reviews/constants";
import { type Review } from "@/modules/reviews/types";

export const getById = protectedProcedure
  .input(z.string())
  .query(async ({ ctx, input }) => {
    const review = await ctx.db.reviews.findUnique({
      where: { id: input },
      select: PRIVATE_REVIEW_FIELDS,
    });
    if (!review) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Review not found",
      });
    }
    return {
      ...review,
      tips: review.tips ?? "",
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
    } satisfies Review;
  });
