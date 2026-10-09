import { TRPCError } from "@trpc/server";
import { type Prisma, type PrismaClient } from "@/generated/prisma/client";
import { ReviewType } from "@/generated/prisma/enums";
import {
  type Review,
  ReviewsFilterFor,
  ReviewsSortBy,
} from "@/common/types/reviews";
import { z } from "zod";
import {
  DEFAULT_PAGE_SIZE,
  PRIVATE_REVIEW_FIELDS,
  PUBLIC_REVIEW_FIELDS,
  REVIEW_PAGE_MAX,
  REVIEW_SKIP_MAX,
} from "./constants";
import { censorProfanity } from "@/server/profanity";
import { loadReviewEngagement } from "./engagement";
import { getOrderBy } from "./functions";

export const reviewPageInput = z.object({
  cursor: z.string().nullish(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(REVIEW_PAGE_MAX)
    .default(DEFAULT_PAGE_SIZE),
  skip: z.number().int().min(0).max(REVIEW_SKIP_MAX).default(0),
  filterFor: z.enum(ReviewsFilterFor),
  sortBy: z.enum(ReviewsSortBy),
});

export const includeEngagementInput = z.object({
  includeEngagement: z.boolean().default(false),
});

export const reviewListInputs = {
  all: reviewPageInput.extend({
    universityId: z.number().optional(),
    courseId: z.string().optional(),
    profId: z.string().optional(),
  }),
  course: reviewPageInput.extend({
    code: z.string(),
    slugs: z.string().array().optional(),
  }),
  professor: reviewPageInput.extend({
    slug: z.string(),
    universityId: z.number().optional(),
    courseCodes: z.string().array().optional(),
  }),
} as const;

export type ReviewScope =
  | { kind: "all"; universityId?: number; courseId?: string; profId?: string }
  | { kind: "course"; code: string; profSlugs?: string[] }
  | {
      kind: "professor";
      slug: string;
      universityId?: number;
      courseCodes?: string[];
    };

export type ReviewViewer =
  | { kind: "public" }
  | { kind: "member"; userId: string; includeEngagement?: boolean };

export type ReviewPage = { items: Review[]; nextCursor: string | undefined };

type PublicReviewRow = Prisma.ReviewsGetPayload<{
  select: typeof PUBLIC_REVIEW_FIELDS;
}>;

type PrivateReviewRow = Prisma.ReviewsGetPayload<{
  select: typeof PRIVATE_REVIEW_FIELDS;
}>;

const sharedFields = (row: PublicReviewRow) => ({
  createdAt: row.createdAt.getTime(),
  courseCode: row.reviewedCourse.code,
  courseName: row.reviewedCourse.name,
  username: row.reviewer.username ?? "Anonymous",
  reviewLabels: row.reviewLabels.map((rl) => ({ name: rl.label.name })),
  likeCount: row.countVotes,
  reviewFor:
    row.reviewedCourseId && row.reviewedProfessorId
      ? ReviewType.PROFESSOR
      : ReviewType.COURSE,
  professorName: row.reviewedProfessor?.name,
  professorSlug: row.reviewedProfessor?.slug,
  university: row.reviewedUniversity.abbrv,
});

export const toPublicReview = (row: PublicReviewRow): Review =>
  ({
    id: row.id,
    rating: 0,
    countEventViews: row.countEventViews,
    body: "",
    tips: "",
    ...sharedFields(row),
  }) satisfies Review;

export const toMemberReview = (row: PrivateReviewRow): Review =>
  ({
    ...row,
    body: censorProfanity(row.body),
    tips: censorProfanity(row.tips ?? ""),
    ...sharedFields(row),
  }) satisfies Review;

export function buildReviewWhere(
  scope: ReviewScope,
  filterFor: ReviewsFilterFor,
  viewer: ReviewViewer,
): Prisma.ReviewsWhereInput {
  const where: Prisma.ReviewsWhereInput = {};

  if (scope.kind === "all") {
    where.reviewedUniversityId = scope.universityId;
    where.reviewedCourseId = scope.courseId;
    where.reviewedProfessorId = scope.profId;
  } else if (scope.kind === "course") {
    where.reviewedCourse = { code: scope.code };
    if (scope.profSlugs) {
      where.reviewedProfessor = { slug: { in: scope.profSlugs } };
    }
  } else if (scope.kind === "professor") {
    where.reviewedUniversityId = scope.universityId;
    where.reviewedCourse = { code: { in: scope.courseCodes } };
    where.reviewedProfessor = { slug: scope.slug };
  }

  if (viewer.kind === "member" && filterFor === ReviewsFilterFor.UPVOTED) {
    where.votes = { some: { voterId: viewer.userId } };
  }

  return where;
}

export async function listReviews(
  db: PrismaClient,
  args: {
    scope: ReviewScope;
    page: z.infer<typeof reviewPageInput>;
    viewer: ReviewViewer;
  },
): Promise<ReviewPage> {
  const { scope, page, viewer } = args;
  const where = buildReviewWhere(scope, page.filterFor, viewer);
  const select =
    viewer.kind === "public" ? PUBLIC_REVIEW_FIELDS : PRIVATE_REVIEW_FIELDS;

  const reviews = await db.reviews.findMany({
    skip: page.skip,
    take: page.limit + 1,
    cursor: page.cursor ? { id: page.cursor } : undefined,
    where,
    orderBy: getOrderBy(page.sortBy),
    select,
  });

  let nextCursor: string | undefined = undefined;
  if (reviews.length > page.limit) {
    const nextItem = reviews.pop();
    nextCursor = nextItem?.id;
  }

  const items =
    viewer.kind === "public"
      ? (reviews as unknown as PublicReviewRow[]).map(toPublicReview)
      : (reviews as unknown as PrivateReviewRow[]).map(toMemberReview);

  if (
    viewer.kind === "member" &&
    viewer.includeEngagement &&
    items.length > 0
  ) {
    const itemIds = items.map((item) => item.id);
    const engagementMap = await loadReviewEngagement(
      db,
      viewer.userId,
      itemIds,
    );
    for (const item of items) {
      item.engagement = engagementMap[item.id];
    }
  }

  return {
    items,
    nextCursor,
  };
}

export async function getReviewById(
  db: PrismaClient,
  reviewId: string,
  viewerId: string,
): Promise<Review> {
  const review = await db.reviews.findUnique({
    where: { id: reviewId },
    select: PRIVATE_REVIEW_FIELDS,
  });
  if (!review) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Review not found",
    });
  }
  const mapped = toMemberReview(review);
  const engagementMap = await loadReviewEngagement(db, viewerId, [reviewId]);
  mapped.engagement = engagementMap[reviewId];
  return mapped;
}
