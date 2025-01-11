import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { type Review } from "@/modules/reviews/types";
import { reviewFormSchema } from "@/common/tools/zod/schemas";
import { ReviewableEnum } from "@/modules/submit/types";
import { toTitleCase } from "@/common/functions";

const DEFAULT_PAGE_SIZE = 10;

const PUBLIC_REVIEW_FIELDS = {
  id: true,
  rating: true,
  createdAt: true,
  reviewedUniversityId: true,
  reviewedProfessorId: true,
  reviewedCourseId: true,
  reviewedCourse: {
    select: {
      code: true,
      name: true,
    },
  },
  reviewer: {
    select: {
      username: true,
    },
  },
  reviewLabels: {
    include: {
      label: {
        select: {
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      votes: true,
    },
  },
  reviewedProfessor: {
    select: {
      name: true,
      slug: true,
    },
  },
  reviewedUniversity: {
    select: {
      abbrv: true,
    },
  },
} satisfies Prisma.ReviewsSelect;

const PRIVATE_REVIEW_FIELDS = {
  ...PUBLIC_REVIEW_FIELDS,
  body: true,
  tips: true,
  rating: true,
} satisfies Prisma.ReviewsSelect;

export const reviewsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      reviewFormSchema.and(
        z.object({
          user: z.object({ id: z.string() }),
        }),
      ),
    )
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
      const { type, user, professor: profReview, course: courseReview } = input;
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
              reviewerId: user.id,
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
    }),
  getById: protectedProcedure
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
        likeCount: review._count.votes,
        reviewFor:
          review.reviewedCourseId && review.reviewedProfessorId
            ? ("professor" as "professor" | "course")
            : ("course" as "professor" | "course"),
        professorName: review.reviewedProfessor?.name,
        professorSlug: review.reviewedProfessor?.slug,
        university: review.reviewedUniversity.abbrv,
      } satisfies Review;
    }),
  getAllProtected: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        universityId: z.number().optional(),
        courseId: z.string().optional(),
        profId: z.string().optional(),
        latest: z.boolean().optional().default(true),
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
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
        select: PRIVATE_REVIEW_FIELDS,
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
              tips: review.tips ?? "",
              createdAt: review.createdAt.getTime(),
              courseCode: review.reviewedCourse.code,
              courseName: review.reviewedCourse.name,
              username: review.reviewer.username ?? "Anonymous",
              reviewLabels: review.reviewLabels.map((rl) => ({
                name: rl.label.name,
              })),
              likeCount: review._count.votes,
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),
  getAll: publicProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        universityId: z.number().optional(),
        courseId: z.string().optional(),
        profId: z.string().optional(),
        latest: z.boolean().optional().default(true),
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
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
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
              likeCount: review._count.votes,
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),
  getByProfSlugProtected: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        slug: z.string(),
        universityId: z.number().optional(),
        courseCodes: z.string().array().optional(),
        latest: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.reviews.findMany({
        skip: input.skip,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          reviewedUniversityId: input.universityId,
          reviewedCourse: { code: { in: input.courseCodes } },
          reviewedProfessor: { slug: input.slug },
        },
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
        select: PRIVATE_REVIEW_FIELDS,
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
              tips: review.tips ?? "",
              createdAt: review.createdAt.getTime(),
              courseCode: review.reviewedCourse.code,
              courseName: review.reviewedCourse.name,
              username: review.reviewer.username ?? "Anonymous",
              reviewLabels: review.reviewLabels.map((rl) => ({
                name: rl.label.name,
              })),
              likeCount: review._count.votes,
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),
  getByProfSlug: publicProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        slug: z.string(),
        universityId: z.number().optional(),
        courseCodes: z.string().array().optional(),
        latest: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.reviews.findMany({
        skip: input.skip,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          reviewedUniversityId: input.universityId,
          reviewedCourse: { code: { in: input.courseCodes } },
          reviewedProfessor: { slug: input.slug },
        },
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
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
              likeCount: review._count.votes,
              reviewLabels: review.reviewLabels.map((rl) => ({
                name: rl.label.name,
              })),
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),

  getByCourseCodeProtected: protectedProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        code: z.string(),
        slugs: z.string().array().optional(),
        latest: z.boolean().optional().default(true),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reviews = await ctx.db.reviews.findMany({
        skip: input.skip,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: {
          reviewedCourse: { code: input.code },
          reviewedProfessor: input.slugs && { slug: { in: input.slugs } },
        },
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
        select: PRIVATE_REVIEW_FIELDS,
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
              tips: review.tips ?? "",
              createdAt: review.createdAt.getTime(),
              courseCode: review.reviewedCourse.code,
              courseName: review.reviewedCourse.name,
              username: review.reviewer.username ?? "Anonymous",
              reviewLabels: review.reviewLabels.map((rl) => ({
                name: rl.label.name,
              })),
              likeCount: review._count.votes,
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),

  getByCourseCode: publicProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().default(DEFAULT_PAGE_SIZE),
        skip: z.number().default(0),
        code: z.string(),
        slugs: z.string().array().optional(),
        latest: z.boolean().optional().default(true),
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
        orderBy: input.latest ? { createdAt: "desc" } : undefined,
        select: PRIVATE_REVIEW_FIELDS,
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
              likeCount: review._count.votes,
              reviewLabels: review.reviewLabels.map((rl) => ({
                name: rl.label.name,
              })),
              reviewFor:
                review.reviewedCourseId && review.reviewedProfessorId
                  ? ("professor" as "professor" | "course")
                  : ("course" as "professor" | "course"),
              professorName: review.reviewedProfessor?.name,
              professorSlug: review.reviewedProfessor?.slug,
              university: review.reviewedUniversity.abbrv,
            }) satisfies Review,
        ),
        nextCursor,
      };
    }),

  count: protectedProcedure
    .input(
      z.object({
        profSlug: z.string().optional(),
        courseCode: z.string().optional(),
      }),
    )
    .query(
      async ({ ctx, input }) =>
        await ctx.db.reviews.count({
          where: {
            reviewedCourse: {
              code: input.courseCode,
            },
            reviewedProfessor: {
              slug: input.profSlug,
            },
          },
        }),
    ),

  getMetadataForProf: publicProcedure
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
      const reviewLabelsMetadataForThisProf = await ctx.db.reviewLabels.groupBy(
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
      const professorReviewLabels = await ctx.db.labels.findMany({
        where: {
          typeOf: "PROFESSOR",
        },
      });

      return {
        averageRating: reviewsMetadataForThisProf._avg.rating ?? 0,
        reviewCount: reviewsMetadataForThisProf._count._all,
        reviewLabels: professorReviewLabels.sort().map((label) => ({
          name: toTitleCase(label.name.replaceAll("_", " ")),
          count:
            reviewLabelsMetadataForThisProf.find(
              (rl) => rl.labelId === label.id,
            )?._count.labelId ?? 0,
        })),
      };
    }),

  getMetadataForCourse: publicProcedure
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
      const reviewLabelsMetadataForThisCourse =
        await ctx.db.reviewLabels.groupBy({
          by: ["labelId"],
          _count: {
            labelId: true,
          },
          where: {
            review: reviewWhereInput,
          },
        });

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
    }),
});
