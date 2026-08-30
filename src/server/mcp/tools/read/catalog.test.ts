import { describe, expect, it, vi } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  getBidPredictionTool,
  getBidResultsTool,
  getBidWindowsTool,
  getCourseReviewsTool,
  getProfessorReviewsTool,
  listAcadTermsTool,
} from "./catalog";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  universityId: 1,
  firstName: null,
  lastName: null,
  telegramId: null,
  photoUrl: null,
  facultyId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Each tool calls a procedure on a specific sub-router (e.g. caller.reviews.getByCourseCodeProtected),
// so place each mock under the router namespace the tool actually uses.
function makeCaller(procs: Record<string, unknown>) {
  return {
    reviews: {
      getByCourseCodeProtected: procs.getByCourseCodeProtected,
      getByProfSlugProtected: procs.getByProfSlugProtected,
    },
    bidPredictions: { getBy: procs.getBy },
    bidResults: { getBy: procs.getBy },
    acadTerms: { list: procs.list },
    bidWindows: {
      getByAcadTerm: procs.getByAcadTerm,
      getCurrentWindow: procs.getCurrentWindow,
    },
  } as unknown as ToolContext["caller"];
}

// Matches the real shape returned by reviews.getByCourseCodeProtected /
// getByProfSlugProtected (flattened Review: reviewLabels[{name}], likeCount,
// courseCode, professorName, createdAt as epoch ms).
const protectedReview = {
  id: "rv1",
  rating: 4,
  body: "Heavy group work but fair grading.",
  tips: "Start the project early.",
  createdAt: Date.UTC(2026, 0, 15),
  courseCode: "COR-MGMT1202",
  courseName: "Managing Your Business",
  username: "Anonymous",
  likeCount: 12,
  reviewLabels: [{ name: "Group Work" }, { name: "Fair" }],
  reviewFor: "PROFESSOR",
  professorName: "Prof X",
  professorSlug: "prof-x",
  university: "SMU",
};

const expectedCard = {
  id: "rv1",
  body: "Heavy group work but fair grading.",
  tips: "Start the project early.",
  rating: 4,
  labels: ["Group Work", "Fair"],
  voteCount: 12,
  createdAt: "2026-01-15T00:00:00.000Z",
  courseCode: "COR-MGMT1202",
  professorName: "Prof X",
};

describe("catalog read tools", () => {
  it("get-course-reviews calls reviews.getByCourseCodeProtected and stays read-only", async () => {
    const fn = vi.fn().mockResolvedValue({ items: [], nextCursor: undefined });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByCourseCodeProtected: fn }),
    };
    const result = await getCourseReviewsTool.run(ctx, { code: "ACC101", limit: 10 });
    expect(fn).toHaveBeenCalledWith({
      code: "ACC101",
      limit: 10,
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
    expect(getCourseReviewsTool.readOnly).toBe(true);
    expect(result.isError).toBeUndefined();
  });

  it("get-professor-reviews calls reviews.getByProfSlugProtected and stays read-only", async () => {
    const fn = vi.fn().mockResolvedValue({ items: [], nextCursor: undefined });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByProfSlugProtected: fn }),
    };
    const result = await getProfessorReviewsTool.run(ctx, { slug: "prof-x", limit: 5 });
    expect(fn).toHaveBeenCalledWith({
      slug: "prof-x",
      limit: 5,
      filterFor: ReviewsFilterFor.ALL,
      sortBy: ReviewsSortBy.LATEST,
    });
    expect(getProfessorReviewsTool.readOnly).toBe(true);
    expect(result.isError).toBeUndefined();
  });

  it("both review tools declare the review-cards widget", () => {
    expect(getCourseReviewsTool.widgetName).toBe("review-cards");
    expect(getProfessorReviewsTool.widgetName).toBe("review-cards");
  });

  it("get-course-reviews toWidgetProps normalizes the { items, nextCursor } envelope", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ items: [protectedReview], nextCursor: "rv2" });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByCourseCodeProtected: fn }),
    };
    const result = await getCourseReviewsTool.run(ctx, { code: "COR-MGMT1202", limit: 20 });
    const props = getCourseReviewsTool.toWidgetProps?.(result);
    expect(props).toEqual({ context: "COR-MGMT1202", reviews: [expectedCard] });
  });

  it("get-professor-reviews toWidgetProps normalizes the { items, nextCursor } envelope", async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ items: [protectedReview], nextCursor: undefined });
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByProfSlugProtected: fn }),
    };
    const result = await getProfessorReviewsTool.run(ctx, { slug: "prof-x", limit: 20 });
    const props = getProfessorReviewsTool.toWidgetProps?.(result);
    expect(props).toEqual({ context: "prof-x", reviews: [expectedCard] });
  });

  it("toWidgetProps also handles a bare array with raw prisma-shaped rows", async () => {
    const fn = vi.fn().mockResolvedValue([
      {
        id: "rv9",
        rating: 2,
        body: "Tough but worth it.",
        tips: null,
        createdAt: "2026-02-01T00:00:00.000Z",
        countVotes: 0,
        reviewedCourse: { code: "CS101" },
        reviewedProfessor: null,
        reviewLabels: [{ label: { name: "Heavy Workload" } }],
      },
    ]);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByCourseCodeProtected: fn }),
    };
    const result = await getCourseReviewsTool.run(ctx, { code: "CS101", limit: 20 });
    const props = getCourseReviewsTool.toWidgetProps?.(result);
    expect(props).toEqual({
      context: "CS101",
      reviews: [
        {
          id: "rv9",
          body: "Tough but worth it.",
          tips: null,
          rating: 2,
          labels: ["Heavy Workload"],
          voteCount: 0,
          createdAt: "2026-02-01T00:00:00.000Z",
          courseCode: "CS101",
          professorName: null,
        },
      ],
    });
  });

  it("review tools return errText when the procedure rejects", async () => {
    const courseFn = vi.fn().mockRejectedValue(new Error("db down"));
    const profFn = vi.fn().mockRejectedValue(new Error("db down"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getByCourseCodeProtected: courseFn,
        getByProfSlugProtected: profFn,
      }),
    };
    const courseResult = await getCourseReviewsTool.run(ctx, { code: "ACC101", limit: 10 });
    expect(courseResult.isError).toBe(true);
    expect(courseResult.content[0]?.text).toContain("db down");
    const profResult = await getProfessorReviewsTool.run(ctx, { slug: "prof-x", limit: 10 });
    expect(profResult.isError).toBe(true);
    expect(profResult.content[0]?.text).toContain("db down");
  });

  it("get-bid-prediction calls bidPredictions.getBy with classId", async () => {
    const fn = vi.fn().mockResolvedValue(null);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getBy: fn }) };
    await getBidPredictionTool.run(ctx, { classId: "cl1" });
    expect(fn).toHaveBeenCalledWith({ classId: "cl1" });
  });

  it("get-bid-results passes filters to bidResults.getBy", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getBy: fn }) };
    await getBidResultsTool.run(ctx, { courseCode: "ACC101", section: "G1" });
    expect(fn).toHaveBeenCalledWith({ courseCode: "ACC101", section: "G1" });
  });

  it("list-acad-terms calls acadTerms.list()", async () => {
    const fn = vi.fn().mockResolvedValue([]);
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ list: fn }) };
    await listAcadTermsTool.run(ctx, {});
    expect(fn).toHaveBeenCalledWith();
  });

  it("get-bid-windows calls getByAcadTerm when a term is given, else getCurrentWindow", async () => {
    const byTerm = vi.fn().mockResolvedValue({});
    const current = vi.fn().mockResolvedValue({});
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getByAcadTerm: byTerm, getCurrentWindow: current }),
    };
    await getBidWindowsTool.run(ctx, { acadTermId: "t1" });
    expect(byTerm).toHaveBeenCalledWith({ acadTermId: "t1" });
    await getBidWindowsTool.run(ctx, {});
    expect(current).toHaveBeenCalledWith();
  });
});
