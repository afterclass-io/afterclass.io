import { Prisma } from "@/generated/prisma/client";
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
      await ctx.db.$transaction(async (tx) => {
        await Promise.all(
          reviewsToCreate.map(async (r) => {
            const review = await tx.reviews.create({
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
              await tx.reviewLabels.createMany({
                data: r.labels.map((label) => ({
                  reviewId: review.id,
                  labelId: parseInt(label),
                })),
              });
            }
          }),
        );
      });
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
