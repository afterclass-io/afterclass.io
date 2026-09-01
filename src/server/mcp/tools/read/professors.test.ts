import { describe, expect, it, vi } from "vitest";

import type { ToolContext } from "../../types";
import type { SessionUser } from "@/server/auth/config";
import { searchProfessorsTool } from "./professors";

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

// The tool calls a procedure on the professors sub-router.
function makeCaller(procs: Record<string, unknown>) {
  return {
    professors: { search: procs.search },
  } as unknown as ToolContext["caller"];
}

describe("search-professors", () => {
  it("calls professors.search with query+limit and returns JSON { rows, count }", async () => {
    const fn = vi.fn().mockResolvedValue({
      rows: [{ id: "p1", slug: "goh-jing-rong", name: "GOH Jing Rong" }],
      count: 1,
    });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ search: fn }) };
    const result = await searchProfessorsTool.run(ctx, {
      query: "Goh Jing Rong",
      limit: 5,
    });

    expect(fn).toHaveBeenCalledWith({ query: "Goh Jing Rong", limit: 5 });
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as {
      rows: unknown[];
      count: number;
    };
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it("returns jsonText([]) (not an error) when there are no matches", async () => {
    const fn = vi.fn().mockResolvedValue({ rows: [], count: 0 });
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ search: fn }) };
    const result = await searchProfessorsTool.run(ctx, { query: "zzzz", limit: 10 });

    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0]!.text) as unknown[];
    expect(parsed).toEqual([]);
  });

  it("returns errText when the procedure rejects", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const ctx: ToolContext = { user: fakeUser, caller: makeCaller({ search: fn }) };
    const result = await searchProfessorsTool.run(ctx, { query: "goh", limit: 10 });

    expect(result.isError).toBe(true);
  });
});
