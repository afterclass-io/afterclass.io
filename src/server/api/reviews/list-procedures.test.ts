import { ReviewType } from "@prisma/client";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import { getAll } from "./getAll";
import { getAllProtected } from "./getAllProtected";
import { getByCourseCode } from "./getByCourseCode";
import { getByCourseCodeProtected } from "./getByCourseCodeProtected";
import { getByProfSlug } from "./getByProfSlug";
import { getByProfSlugProtected } from "./getByProfSlugProtected";

const router = createTRPCRouter({
  getAll,
  getAllProtected,
  getByCourseCode,
  getByCourseCodeProtected,
  getByProfSlug,
  getByProfSlugProtected,
});

/** A raw row shaped like PRIVATE_REVIEW_FIELDS (superset of PUBLIC). */
function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "r1",
    rating: 5,
    body: "real body",
    tips: "real tips",
    countEventViews: 3,
    countVotes: 7,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    reviewedUniversityId: 1,
    reviewedProfessorId: "p1",
    reviewedCourseId: "c1",
    reviewedCourse: { code: "CS101", name: "Intro to CS" },
    reviewer: { username: "alice" },
    reviewLabels: [{ label: { name: "INTERESTING" } }],
    reviewedProfessor: { name: "Dr X", slug: "dr-x" },
    reviewedUniversity: { abbrv: "SMU" },
    ...overrides,
  };
}

function makeDbMock(rows: unknown[]) {
  return { reviews: { findMany: vi.fn().mockResolvedValue(rows) } };
}

const base = { filterFor: ReviewsFilterFor.ALL, sortBy: ReviewsSortBy.LATEST };

const allProcs = [
  { name: "getAll" as const, isProtected: false, extra: {} },
  { name: "getAllProtected" as const, isProtected: true, extra: {} },
  {
    name: "getByCourseCode" as const,
    isProtected: false,
    extra: { code: "CS101" },
  },
  {
    name: "getByCourseCodeProtected" as const,
    isProtected: true,
    extra: { code: "CS101" },
  },
  {
    name: "getByProfSlug" as const,
    isProtected: false,
    extra: { slug: "dr-x" },
  },
  {
    name: "getByProfSlugProtected" as const,
    isProtected: true,
    extra: { slug: "dr-x" },
  },
];

const protectedProcs = allProcs.filter((p) => p.isProtected);
const publicProcs = allProcs.filter((p) => !p.isProtected);

/** The `where` arg of the mocked findMany's most recent call. */
const lastWhere = (fn: { mock: { lastCall?: unknown[] } }) =>
  (fn.mock.lastCall?.[0] as { where?: Record<string, unknown> } | undefined)
    ?.where ?? {};

beforeEach(() => vi.clearAllMocks());

describe.each(allProcs)("reviews.$name (mocked db)", ({ name, extra }) => {
  const callWith = (
    db: ReturnType<typeof makeDbMock>,
    input: Record<string, unknown>,
  ) => {
    const caller = makeCaller(router.createCaller, db);
    return (
      caller[name] as (
        i: unknown,
      ) => Promise<{ items: unknown[]; nextCursor?: string }>
    )({
      ...base,
      ...extra,
      ...input,
    });
  };

  it("pops the extra row and returns its id as nextCursor", async () => {
    const db = makeDbMock([
      makeRow({ id: "a" }),
      makeRow({ id: "b" }),
      makeRow({ id: "c" }),
    ]);
    const res = await callWith(db, { limit: 2 });

    expect(db.reviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        cursor: undefined,
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).toBe("c");
  });

  it("leaves nextCursor undefined when the page is not full", async () => {
    const db = makeDbMock([makeRow({ id: "a" }), makeRow({ id: "b" })]);
    const res = await callWith(db, { limit: 2 });
    expect(res.items).toHaveLength(2);
    expect(res.nextCursor).toBeUndefined();
  });

  it("passes the cursor through to findMany when given", async () => {
    const db = makeDbMock([makeRow()]);
    await callWith(db, { cursor: "cur-1", limit: 5 });
    expect(db.reviews.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "cur-1" }, skip: 0 }),
    );
  });

  it("maps rows to the review DTO (username fallback, reviewFor, joins)", async () => {
    const db = makeDbMock([
      makeRow({ id: "with-prof" }),
      makeRow({
        id: "course-only",
        reviewedProfessorId: null,
        reviewedProfessor: null,
        reviewer: { username: null },
      }),
    ]);
    const res = (await callWith(db, { limit: 10 })) as {
      items: Array<Record<string, unknown>>;
    };

    expect(res.items[0]).toMatchObject({
      id: "with-prof",
      courseCode: "CS101",
      courseName: "Intro to CS",
      username: "alice",
      university: "SMU",
      likeCount: 7,
      createdAt: new Date("2024-01-01T00:00:00Z").getTime(),
      reviewLabels: [{ name: "INTERESTING" }],
      reviewFor: ReviewType.PROFESSOR,
      professorName: "Dr X",
      professorSlug: "dr-x",
    });
    expect(res.items[1]).toMatchObject({
      username: "Anonymous",
      reviewFor: ReviewType.COURSE,
    });
    expect(res.items[1]!.professorName).toBeUndefined();
  });
});

describe.each(publicProcs)(
  "reviews.$name hides private fields",
  ({ name, extra }) => {
    it("zeroes rating and blanks body/tips regardless of the row", async () => {
      const db = makeDbMock([makeRow()]);
      const caller = makeCaller(router.createCaller, db);
      const res = await (
        caller[name] as (
          i: unknown,
        ) => Promise<{ items: Array<Record<string, unknown>> }>
      )({
        ...base,
        ...extra,
      });
      expect(res.items[0]).toMatchObject({ rating: 0, body: "", tips: "" });
    });
  },
);

describe.each(protectedProcs)(
  "reviews.$name (protected)",
  ({ name, extra }) => {
    const call = (
      db: ReturnType<typeof makeDbMock>,
      input: Record<string, unknown> = {},
    ) => {
      const caller = makeCaller(router.createCaller, db, {
        user: { id: "u1" },
      });
      return (
        caller[name] as (
          i: unknown,
        ) => Promise<{ items: Array<Record<string, unknown>> }>
      )({
        ...base,
        ...extra,
        ...input,
      });
    };

    it("filters by the caller's votes only when filterFor is UPVOTED", async () => {
      const db = makeDbMock([makeRow()]);

      await call(db, { filterFor: ReviewsFilterFor.UPVOTED });
      expect(lastWhere(db.reviews.findMany)).toMatchObject({
        votes: { some: { voterId: "u1" } },
      });

      await call(db, { filterFor: ReviewsFilterFor.ALL });
      expect(lastWhere(db.reviews.findMany)).not.toHaveProperty("votes");
    });

    it("returns the real rating and coalesces a null tips to an empty string", async () => {
      const db = makeDbMock([
        makeRow({ id: "a", rating: 4, tips: "keep me" }),
        makeRow({ id: "b", tips: null }),
      ]);
      const res = await call(db, { limit: 10 });
      expect(res.items[0]).toMatchObject({ rating: 4, tips: "keep me" });
      expect(res.items[1]!.tips).toBe("");
    });
  },
);
