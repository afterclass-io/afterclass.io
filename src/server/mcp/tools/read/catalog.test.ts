import { describe, expect, it, vi } from "vitest";

import { ReviewsFilterFor, ReviewsSortBy } from "@/modules/reviews/types";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import {
  getBidPredictionTool,
  getBidResultsTool,
  getBidWindowsTool,
  getCourseReviewsTool,
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

// Each tool calls a procedure on a specific sub-router (e.g. caller.reviews.getByCourseCode),
// so place each mock under the router namespace the tool actually uses.
function makeCaller(procs: Record<string, unknown>) {
  return {
    reviews: { getByCourseCode: procs.getByCourseCode },
    bidPredictions: { getBy: procs.getBy },
    bidResults: { getBy: procs.getBy },
    acadTerms: { list: procs.list },
    bidWindows: {
      getByAcadTerm: procs.getByAcadTerm,
      getCurrentWindow: procs.getCurrentWindow,
    },
  } as unknown as ToolContext["caller"];
}

describe("catalog read tools", () => {
  it("get-course-reviews calls reviews.getByCourseCode and stays read-only", async () => {
    const fn = vi.fn().mockResolvedValue({ reviews: [] });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ getByCourseCode: fn }) };
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
