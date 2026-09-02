import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import type { ToolContext } from "@/server/mcp/types";
import type { SessionUser } from "@/server/auth/config";

const { mockCheckAndIncrement } = vi.hoisted(() => ({
  mockCheckAndIncrement: vi.fn() as Mock,
}));

vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));

import { buildAssistantTools, MAX_TOOL_RESULT_CHARS, TRUNCATION_NOTE } from "./tools";
import { allTools } from "@/server/mcp/tools";

const WRITE_LIMIT = 10;

const fakeUser: SessionUser = {
  id: "u1", email: "a@smu.edu.sg", username: "u1", isVerified: true, universityId: 1,
  firstName: null, lastName: null, telegramId: null, photoUrl: null, facultyId: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeContext(): ToolContext {
  const caller = {
    timetable: { searchCourses: vi.fn().mockResolvedValue([{ id: "c1" }]) },
    userBids: {
      setStatus: vi.fn().mockResolvedValue({ id: "b1", status: "SECURED", acadTermId: "AY2026/27-T1" }),
      listMine: vi.fn().mockResolvedValue([]),
      getBudget: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 53 }),
      remove: vi.fn().mockResolvedValue({ success: true, acadTermId: "AY2026/27-T1" }),
      upsertBudget: vi.fn().mockResolvedValue({ balance: 100 }),
    },
    roadmaps: {
      getMine: vi.fn().mockResolvedValue({ roadmap: { id: "r1", name: "My Plan" }, entries: [] }),
      copyPublic: vi.fn().mockResolvedValue({ id: "r2", name: "Copy" }),
      create: vi.fn().mockResolvedValue({ id: "r1" }),
      saveEntries: vi.fn().mockResolvedValue({ count: 1 }),
    },
  } as unknown as ToolContext["caller"];
  return { user: fakeUser, caller };
}

describe("buildAssistantTools", () => {
  beforeEach(() => {
    mockCheckAndIncrement.mockReset();
    mockCheckAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  });

  it("exposes every catalog tool", () => {
    const tools = buildAssistantTools(makeContext(), WRITE_LIMIT);
    for (const t of allTools) expect(tools[t.name]).toBeDefined();
  });

  it("executes a tool and returns the text content", async () => {
    const tools = buildAssistantTools(makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    const result = await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(result).toContain("c1");
  });

  it("throws when a tool returns isError", async () => {
    const ctx = makeContext();
    (ctx.caller as unknown as { timetable: { searchCourses: unknown } }).timetable.searchCourses = vi.fn().mockRejectedValue(new Error("boom"));
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    await expect(
      execute({ acadTermId: "t1", query: "acc" } as never),
    ).rejects.toThrow("boom");
  });

  it("does not rate-limit read-only tools", async () => {
    const tools = buildAssistantTools(makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
  });

  it("runs a write tool when under the write rate limit", async () => {
    const ctx = makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["set-bid-status"]!.execute as unknown as (args: never) => Promise<string>;
    const result = await execute({ id: "b1", status: "SECURED" } as never);
    expect(mockCheckAndIncrement).toHaveBeenCalledWith("chat-write:u1", WRITE_LIMIT, 1);
    expect(result).toContain("b1");
    const setStatus = (ctx.caller as unknown as { userBids: { setStatus: Mock } }).userBids.setStatus;
    expect(setStatus).toHaveBeenCalledWith({ id: "b1", status: "SECURED" });
  });

  it("returns a slow-down result at the limit without calling the underlying procedure", async () => {
    mockCheckAndIncrement.mockResolvedValue({ ok: false, retryAfterSeconds: 42 });
    const ctx = makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["set-bid-status"]!.execute as unknown as (args: never) => Promise<string>;
    const result = await execute({ id: "b1", status: "SECURED" } as never);
    expect(result).toContain("too quickly");
    expect(result).toContain("42");
    const setStatus = (ctx.caller as unknown as { userBids: { setStatus: Mock } }).userBids.setStatus;
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("clamps oversized tool results and appends a truncation note", async () => {
    const huge = "x".repeat(MAX_TOOL_RESULT_CHARS + 1000);
    const ctx = makeContext();
    (ctx.caller.timetable as unknown as { searchCourses: Mock }).searchCourses = vi.fn().mockResolvedValue(huge);
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    const out = await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(out.length).toBeLessThanOrEqual(MAX_TOOL_RESULT_CHARS + TRUNCATION_NOTE.length);
    expect(out).toMatch(/\[truncated/);
  });

  it("passes small tool results through untouched", async () => {
    const tools = buildAssistantTools(makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (args: never) => Promise<string>;
    const out = await execute({ acadTermId: "t1", query: "hello" } as never);
    expect(out).toContain("c1");
    expect(out).not.toMatch(/\[truncated/);
  });

  it("MAX_TOOL_RESULT_CHARS is 24000 and TRUNCATION_NOTE has required copy", () => {
    expect(MAX_TOOL_RESULT_CHARS).toBe(24_000);
    expect(TRUNCATION_NOTE).toBe(
      "\n[truncated - result too large; refine your query or request fewer items]",
    );
  });
});
