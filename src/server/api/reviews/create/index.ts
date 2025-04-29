import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { reviewFormSchema } from "@/common/tools/zod/schemas";
import { protectedProcedure } from "@/server/api/trpc";
import { ReviewableEnum } from "@/modules/submit/types";

export const create = protectedProcedure
  .input(reviewFormSchema)
  .mutation(async ({ input, ctx }) => {
    const course = await ctx.db.courses.findFirst({
      where: {
        id: input.course.value,
      },
    });
    if (!course) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Course not found",
      });
    }
    const { type, professor: profReview, course: courseReview } = input;
    const reviewsToCreate = [courseReview];
    if (type === ReviewableEnum.PROFESSOR) {
      reviewsToCreate.push(profReview);
    }
    try {
      for (const r of reviewsToCreate) {
        const review = await ctx.db.reviews.create({
          data: {
            body: r.body,
            tips: r.tips,
            rating: r.rating,
            reviewedCourseId: input.course.value,
            reviewedFacultyId: course.belongToFacultyId,
            reviewedProfessorId:
              r.value === profReview?.value ? r.value : undefined,
            reviewedUniversityId: course.belongToUniversityId,
            reviewerId: ctx.session.user.id,
          },
        });
        if (r.labels) {
          await ctx.db.reviewLabels.createMany({
            data: r.labels.map((label) => ({
              reviewId: review.id,
              labelId: parseInt(label),
            })),
          });
        }
      }
      return;
    } catch (error) {
      console.error(error);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid input data",
          cause: error,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create review",
      });
    }
  });
