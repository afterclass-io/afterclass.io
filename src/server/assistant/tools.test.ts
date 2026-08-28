import { describe, expect, it, vi } from "vitest";
import type { ToolContext } from "@/server/mcp/types";
import type { SessionUser } from "@/server/auth/config";
import { buildAssistantTools } from "./tools";
import { allTools } from "@/server/mcp/tools";

const fakeUser: SessionUser = {
  id: "u1", email: "a@smu.edu.sg", username: "u1", isVerified: true, universityId: 1,
  firstName: null, lastName: null, telegramId: null, photoUrl: null, facultyId: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeContext(): ToolContext {
  const caller = { timetable: { searchCourses: vi.fn().mockResolvedValue([{ id: "c1" }]) } } as unknown as ToolContext["caller"];
  return { user: fakeUser, caller };
}

describe("buildAssistantTools", () => {
  it("exposes every catalog tool", () => {
    const tools = buildAssistantTools(makeContext());
    for (const t of allTools) expect(tools[t.name]).toBeDefined();
  });

  it("executes a tool and returns the text content", async () => {
    const tools = buildAssistantTools(makeContext());
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    const result = await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(result).toContain("c1");
  });

  it("throws when a tool returns isError", async () => {
    const ctx = makeContext();
    (ctx.caller as unknown as { timetable: { searchCourses: unknown } }).timetable.searchCourses = vi.fn().mockRejectedValue(new Error("boom"));
    const tools = buildAssistantTools(ctx);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    await expect(
      execute({ acadTermId: "t1", query: "acc" } as never),
    ).rejects.toThrow("boom");
  });
});
