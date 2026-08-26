import { Prisma } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewableEnum, ReviewerEnum } from "@/modules/submit/types";
import { create } from "./index";

const router = createTRPCRouter({ create });

const longBody = "a".repeat(200);

function courseOnlyInput(labels?: string[]) {
  return {
    type: ReviewableEnum.COURSE as const,
    submitAs: ReviewerEnum.USER,
    course: {
      value: "course-1",
      rating: 4,
      body: longBody,
      tips: "some tips",
      labels,
    },
    professor: {},
  };
}

function makeDbMock() {
  return {
    courses: { findFirst: vi.fn() },
    reviews: { create: vi.fn() },
    reviewLabels: { createMany: vi.fn() },
  };
}

describe("reviews.create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const dbMock = makeDbMock();
    const caller = makeCaller(router.createCaller, dbMock, null);
    await expect(caller.create(courseOnlyInput())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects a review body shorter than 200 characters", async () => {
    const dbMock = makeDbMock();
    const caller = makeCaller(router.createCaller, dbMock);
    const input = courseOnlyInput();
    input.course.body = "too short";
    await expect(caller.create(input)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMock.courses.findFirst).not.toHaveBeenCalled();
  });

  it("throws NOT_FOUND when the course does not exist", async () => {
    const dbMock = makeDbMock();
    dbMock.courses.findFirst.mockResolvedValue(null);
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.create(courseOnlyInput())).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("creates a course review and its labels", async () => {
    const dbMock = makeDbMock();
    dbMock.courses.findFirst.mockResolvedValue({
      id: "course-1",
      belongToFacultyId: 1,
      belongToUniversityId: 2,
    });
    dbMock.reviews.create.mockResolvedValue({ id: "review-1" });
    dbMock.reviewLabels.createMany.mockResolvedValue({ count: 1 });
    const caller = makeCaller(router.createCaller, dbMock);

    await caller.create(courseOnlyInput(["1"]));

    expect(dbMock.reviews.create).toHaveBeenCalledOnce();
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(dbMock.reviews.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: longBody,
        tips: "some tips",
        rating: 4,
        reviewedCourseId: "course-1",
        reviewedFacultyId: 1,
        reviewedUniversityId: 2,
        reviewerId: "u1",
        reviewedProfessorId: undefined,
      }),
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
    expect(dbMock.reviewLabels.createMany).toHaveBeenCalledOnce();
    expect(dbMock.reviewLabels.createMany).toHaveBeenCalledWith({
      data: [{ reviewId: "review-1", labelId: 1 }],
    });
  });

  it("wraps a known Prisma error as BAD_REQUEST", async () => {
    const dbMock = makeDbMock();
    dbMock.courses.findFirst.mockResolvedValue({
      id: "course-1",
      belongToFacultyId: 1,
      belongToUniversityId: 2,
    });
    dbMock.reviews.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Foreign key violation", {
        code: "P2003",
        clientVersion: "6.3.0",
      }),
    );
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.create(courseOnlyInput())).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("wraps an unexpected error as INTERNAL_SERVER_ERROR", async () => {
    const dbMock = makeDbMock();
    dbMock.courses.findFirst.mockResolvedValue({
      id: "course-1",
      belongToFacultyId: 1,
      belongToUniversityId: 2,
    });
    dbMock.reviews.create.mockRejectedValue(new Error("connection reset"));
    const caller = makeCaller(router.createCaller, dbMock);
    await expect(caller.create(courseOnlyInput())).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
