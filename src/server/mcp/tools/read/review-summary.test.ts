import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getReviewSummaryTool } from "./review-summary";

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

function makeCaller(procs: Record<string, unknown>) {
  return {
    reviews: {
      getMetadataForCourse: procs.getMetadataForCourse,
      getMetadataForProf: procs.getMetadataForProf,
    },
  } as unknown as ToolContext["caller"];
}

const sampleCourseMeta = {
  averageRating: 4.2,
  reviewCount: 15,
  reviewLabels: [
    { name: "Heavy Workload", count: 7 },
    { name: "Fair Grading", count: 3 },
  ],
};

const sampleProfMeta = {
  averageRating: 4.8,
  reviewCount: 22,
  reviewLabels: [
    { name: "Engaging", count: 12 },
    { name: "Approachable", count: 9 },
  ],
};

describe("get-review-summary", () => {
  it("is read-only", () => {
    expect(getReviewSummaryTool.readOnly).toBe(true);
  });

  it("wraps getMetadataForCourse when code is given", async () => {
    const fn = vi.fn().mockResolvedValue(sampleCourseMeta);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getMetadataForCourse: fn }),
    };
    const result = await getReviewSummaryTool.run(ctx, { code: "COR-STAT1202" });
    expect(fn).toHaveBeenCalledWith({ code: "COR-STAT1202" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed.kind).toBe("course");
    expect(parsed.code).toBe("COR-STAT1202");
    expect(parsed.reviewCount).toBe(15);
    expect(parsed.averageRating).toBe(4.2);
    expect((parsed.reviewLabels as unknown[]).length).toBe(2);
  });

  it("wraps getMetadataForProf when professorSlug is given", async () => {
    const fn = vi.fn().mockResolvedValue(sampleProfMeta);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getMetadataForProf: fn }),
    };
    const result = await getReviewSummaryTool.run(ctx, { professorSlug: "john-doe" });
    expect(fn).toHaveBeenCalledWith({ slug: "john-doe" });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as Record<string, unknown>;
    expect(parsed.kind).toBe("professor");
    expect(parsed.professorSlug).toBe("john-doe");
    expect(parsed.reviewCount).toBe(22);
  });

  it("returns errText when neither code nor professorSlug is given", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({}),
    };
    const result = await getReviewSummaryTool.run(ctx, {});
    expect(result.isError).toBe(true);
  });

  it("returns errText when both code and professorSlug are given", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({}),
    };
    const result = await getReviewSummaryTool.run(ctx, {
      code: "COR-STAT1202",
      professorSlug: "john-doe",
    });
    expect(result.isError).toBe(true);
  });

  it("returns errText when the procedure rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getMetadataForCourse: fn }),
    };
    const result = await getReviewSummaryTool.run(ctx, { code: "COR-STAT1202" });
    expect(result.isError).toBe(true);
  });

  it("trims whitespace from code before calling the procedure", async () => {
    const fn = vi.fn().mockResolvedValue(sampleCourseMeta);
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({ getMetadataForCourse: fn }),
    };
    await getReviewSummaryTool.run(ctx, { code: "  COR-STAT1202  " });
    expect(fn).toHaveBeenCalledWith({ code: "COR-STAT1202" });
  });
});
