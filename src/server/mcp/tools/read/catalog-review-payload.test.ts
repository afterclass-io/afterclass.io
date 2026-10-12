import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { getCourseReviewsTool, getProfessorReviewsTool } from "./catalog";

const fakeUser: SessionUser = {
  id: "u1",
  email: "a@smu.edu.sg",
  username: "u1",
  isVerified: true,
  aiConsent: null,
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
      getByCourseCodeProtected: procs.getByCourseCodeProtected,
      getByProfSlugProtected: procs.getByProfSlugProtected,
    },
  } as unknown as ToolContext["caller"];
}

// The agent-facing reviews payload: a bare list becomes { context, items };
// a paged envelope is spread after context.
describe("review tools payload shape", () => {
  it("get-course-reviews wraps a bare list as { context, items }", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getByCourseCodeProtected: vi.fn().mockResolvedValue([{ id: "r1" }]),
      }),
    };
    const result = await getCourseReviewsTool.run(ctx, {
      code: "ACC101",
      limit: 10,
    });
    expect(result.content[0]!.text).toBe(
      JSON.stringify({ context: "ACC101", items: [{ id: "r1" }] }, null, 2),
    );
  });

  it("get-course-reviews spreads a paged envelope after context", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getByCourseCodeProtected: vi.fn().mockResolvedValue({
          items: [{ id: "r1" }],
          nextCursor: "c2",
        }),
      }),
    };
    const result = await getCourseReviewsTool.run(ctx, {
      code: "ACC101",
      limit: 10,
    });
    expect(result.content[0]!.text).toBe(
      JSON.stringify(
        { context: "ACC101", items: [{ id: "r1" }], nextCursor: "c2" },
        null,
        2,
      ),
    );
  });

  it("get-professor-reviews wraps an empty list as { context, items: [] }", async () => {
    const ctx: ToolContext = {
      user: fakeUser,
      caller: makeCaller({
        getByProfSlugProtected: vi.fn().mockResolvedValue([]),
      }),
    };
    const result = await getProfessorReviewsTool.run(ctx, {
      slug: "prof-x",
      limit: 5,
    });
    expect(result.content[0]!.text).toBe(
      JSON.stringify({ context: "prof-x", items: [] }, null, 2),
    );
  });
});
