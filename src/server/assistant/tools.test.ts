import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { makeFakeToolContext } from "@/server/mcp/test-utils/fake-context";

const { mockCheckAndIncrement } = vi.hoisted(() => ({
  mockCheckAndIncrement: vi.fn() as Mock,
}));

// Single-owner budget: dispatch owns the `checkAndIncrement` call
// (via `checkBudget`), so the mock sits at the store — tools.ts no longer
// imports the budget module directly. `getChatConfig` is unmocked, so the
// policy-carried `limit`/`windowMs` decide the charge (limit =
// WRITE_LIMIT, window = 60_000 → windowMinutes 1).
vi.mock("@/server/assistant/ratelimit", () => ({
  checkAndIncrement: mockCheckAndIncrement,
}));

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (tools.ts now reaches it via @/mcp/dispatch → ./user → caller).
vi.mock("server-only", () => ({}));

import {
  buildAssistantTools,
  MAX_TOOL_RESULT_CHARS,
  TRUNCATION_NOTE,
} from "./tools";
import { allTools } from "@/server/mcp/tools";

const WRITE_LIMIT = 10;

// Shared RouterCaller-backed fake context: per-router
// procedure stubs win over the real procedures. The stubs below are the
// precise procedure mocks these tests pin exact assertions against — kept
// here (not replaced by a generic helper) so each test controls the values
// its assertions read back. What the factory replaces is the hand-built
// caller OBJECT + fake user: one shared default instead of per-file copies.
//
// NOTE: stub-everything-on-the-path is REQUIRED, not optional: unstubbed
// procedures are live against the test DB (same test-session caller the
// chat route builds). The chat path never touches term
// resolution for these tools (explicit acadTermId / no term-scoped call),
// so the stubs below fully cover every procedure invoked.
function makeContext() {
  return makeFakeToolContext({
    caller: {
      timetable: { searchCourses: vi.fn().mockResolvedValue([{ id: "c1" }]) },
      userBids: {
        setStatus: vi.fn().mockResolvedValue({
          id: "b1",
          status: "SECURED",
          acadTermId: "AY202627T1",
        }),
        listMine: vi.fn().mockResolvedValue([]),
        getBudget: vi.fn().mockResolvedValue(null),
        upsert: vi
          .fn()
          .mockResolvedValue({ id: "b1", classId: "cl1", bidWindowId: 53 }),
        remove: vi
          .fn()
          .mockResolvedValue({ success: true, acadTermId: "AY202627T1" }),
        upsertBudget: vi.fn().mockResolvedValue({ balance: 100 }),
      },
      bidWindows: {
        getCurrentWindow: vi.fn().mockResolvedValue({
          id: 53,
          opensAt: new Date(Date.now() - 60_000),
          resultsAt: new Date(Date.now() + 60_000),
        }),
      },
      roadmaps: {
        getMine: vi.fn().mockResolvedValue({
          roadmap: { id: "r1", name: "My Plan" },
          entries: [],
        }),
        listMine: vi.fn().mockResolvedValue([]),
        copyPublic: vi.fn().mockResolvedValue({ id: "r2", name: "Copy" }),
        create: vi.fn().mockResolvedValue({ id: "r1" }),
        saveEntries: vi.fn().mockResolvedValue({ count: 1 }),
      },
    },
  });
}

describe("buildAssistantTools", () => {
  beforeEach(() => {
    mockCheckAndIncrement.mockReset();
    mockCheckAndIncrement.mockResolvedValue({ ok: true, retryAfterSeconds: 0 });
  });

  it("exposes every catalog tool", async () => {
    const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
    for (const t of allTools) expect(tools[t.name]).toBeDefined();
  });

  it("aliases hyphenated names to snake_case so the model never hits unknown tools", async () => {
    const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
    const hyphen = tools["get-my-roadmap"] as unknown as {
      description: string;
    };
    const snake = tools.get_my_roadmap as unknown as {
      description: string;
    };
    expect(snake).toBeDefined();
    expect(snake.description).toBe(hyphen.description);
    expect(tools.bid).toBeUndefined();
  });

  it("executes a tool and returns the text content", async () => {
    const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const result = await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(result).toContain("c1");
  });

  it("throws when a tool returns isError", async () => {
    const ctx = await makeContext();
    (
      ctx.caller as unknown as { timetable: { searchCourses: unknown } }
    ).timetable.searchCourses = vi.fn().mockRejectedValue(new Error("boom"));
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    await expect(
      execute({ acadTermId: "t1", query: "acc" } as never),
    ).rejects.toThrow("boom");
  });

  it("does not rate-limit read-only tools", async () => {
    const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    await execute({ acadTermId: "t1", query: "acc" } as never);
    expect(mockCheckAndIncrement).not.toHaveBeenCalled();
  });

  it("runs a write tool when under the write rate limit", async () => {
    const ctx = await makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["set-bid-status"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const result = await execute({
      id: "b1",
      status: "SECURED",
      confirm: true,
    } as never);
    // Single-owner budget: dispatch charges the store directly —
    // key `<prefix>:<userId>`, policy-carried limit, windowMs 60_000 → 1
    // window-minute.
    expect(mockCheckAndIncrement).toHaveBeenCalledWith(
      "chat-write:u1",
      WRITE_LIMIT,
      1,
    );
    expect(result).toContain("b1");
    const setStatus = (
      ctx.caller as unknown as { userBids: { setStatus: Mock } }
    ).userBids.setStatus;
    expect(setStatus).toHaveBeenCalledWith({ id: "b1", status: "SECURED" });
  });

  it("returns a slow-down result at the limit without calling the underlying procedure", async () => {
    mockCheckAndIncrement.mockResolvedValue({
      ok: false,
      retryAfterSeconds: 42,
    });
    const ctx = await makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["set-bid-status"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const result = await execute({
      id: "b1",
      status: "SECURED",
      confirm: true,
    } as never);
    expect(result).toContain("too quickly");
    expect(result).toContain("42");
    const setStatus = (
      ctx.caller as unknown as { userBids: { setStatus: Mock } }
    ).userBids.setStatus;
    expect(setStatus).not.toHaveBeenCalled();
  });

  it("clamps oversized tool results and appends a truncation note", async () => {
    // Mock at the procedure level with the shape the catalog tool expects
    // (an array of course rows — it maps over them before JSON-encoding).
    const hugeRows = Array.from({ length: 500 }, (_, i) => ({
      code: `C${i}`,
      name: "x".repeat(60),
      sections: [],
    }));
    const ctx = await makeContext();
    (ctx.caller.timetable as unknown as { searchCourses: Mock }).searchCourses =
      vi.fn().mockResolvedValue(hugeRows);
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const out = await execute({ acadTermId: "t1", query: "acc" } as never);
    // dispatch wraps success text in <tool_output> delimiters, so
    // the bound gains the delimiter overhead on top of chars + note.
    expect(out.length).toBeLessThanOrEqual(
      MAX_TOOL_RESULT_CHARS +
        TRUNCATION_NOTE.length +
        "<tool_output>\n\n</tool_output>".length,
    );
    expect(out).toMatch(/\[truncated/);
    expect(out).toContain("<tool_output>");
  });

  it("passes small tool results through untouched", async () => {
    const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
    const execute = tools["search-courses"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
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

  it.each([
    "remove-timetable",
    "remove-class-from-timetable",
    "remove-bid",
    "remove-roadmap",
    "save-roadmap-entries",
    "save-bids",
    "set-bid-status",
    "set-bid-budget",
    "set-timetable-visibility",
    "set-roadmap-visibility",
    "get-timetable-calendar-link",
  ])(
    "chat execute blocks %s without confirm:true (same message as MCP dispatch)",
    async (name) => {
      const ctx = await makeContext();
      const tools = buildAssistantTools(ctx, WRITE_LIMIT);
      const execute = tools[name]!.execute as unknown as (
        args: never,
      ) => Promise<string>;
      const result = await execute({} as never);
      expect(result).toContain("confirm:true");
      // Gated before the write budget is touched and before the procedure runs
      expect(mockCheckAndIncrement).not.toHaveBeenCalled();
    },
  );

  it("chat execute runs a gated tool with confirm:true", async () => {
    const ctx = await makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools["set-bid-status"]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const result = await execute({
      id: "b1",
      status: "SECURED",
      confirm: true,
    } as never);
    expect(result).toContain("b1");
  });

  it("two-tier gate: destructive set is exactly the 11 confirm-required tools; constructive writes are budget-only", async () => {
    const { destructiveTools, constructiveTools } =
      await import("@/mcp/rate-limit");
    expect([...destructiveTools].sort()).toEqual([
      "get-timetable-calendar-link",
      "remove-bid",
      "remove-class-from-timetable",
      "remove-roadmap",
      "remove-timetable",
      "save-bids",
      "save-roadmap-entries",
      "set-bid-budget",
      "set-bid-status",
      "set-roadmap-visibility",
      "set-timetable-visibility",
    ]);
    expect([...constructiveTools].sort()).toEqual([
      "add-class-to-timetable",
      "copy-public-roadmap",
      "create-roadmap",
      "create-timetable",
      "rename-roadmap",
      "rename-timetable",
      "set-active-roadmap",
      "set-matric-term",
      "sync-roadmap-progress",
      "upsert-bid",
      "upsert-roadmap-entry",
    ]);
    // Every non-readOnly catalog tool is in exactly one tier; reads in neither.
    const writeNames = allTools
      .filter((t) => !t.readOnly)
      .map((t) => t.name)
      .sort();
    expect([...destructiveTools, ...constructiveTools].sort()).toEqual(
      writeNames,
    );
    for (const t of allTools.filter((t) => t.readOnly)) {
      expect(destructiveTools.has(t.name)).toBe(false);
      expect(constructiveTools.has(t.name)).toBe(false);
    }
  });

  it.each([
    ["copy-public-roadmap", { roadmapId: "r1" }],
    ["create-roadmap", { name: "Plan" }],
    ["upsert-bid", { classId: "cl1", bidAmount: 10 }],
  ])("constructive tool %s runs WITHOUT confirm:true", async (name, args) => {
    const ctx = await makeContext();
    const tools = buildAssistantTools(ctx, WRITE_LIMIT);
    const execute = tools[name]!.execute as unknown as (
      args: never,
    ) => Promise<string>;
    const result = await execute(args as never);
    expect(result).not.toMatch(/requires explicit confirmation/);
  });

  it.each([
    ["save-roadmap-entries", { roadmapId: "r1", entries: [] }],
    [
      "save-bids",
      { bids: [{ courseCode: "COR-IS1702", section: "G1", bidAmount: 10 }] },
    ],
    ["set-bid-status", { id: "b1", status: "SECURED" }],
    ["set-bid-budget", { balance: 100 }],
    ["set-timetable-visibility", { timetableId: "tt1", visibility: "PUBLIC" }],
    ["set-roadmap-visibility", { roadmapId: "r1", visibility: "PUBLIC" }],
    ["get-timetable-calendar-link", { timetableId: "tt1" }],
  ])(
    "chat schema for %s declares optional confirm so confirm:true survives validation",
    async (name, baseArgs) => {
      const tools = buildAssistantTools(await makeContext(), WRITE_LIMIT);
      const inputSchema = tools[name]!.inputSchema;
      const parsed = (
        inputSchema as unknown as {
          safeParse: (v: unknown) => {
            success: boolean;
            data?: Record<string, unknown>;
          };
        }
      ).safeParse({ ...baseArgs, confirm: true });
      expect(parsed.success).toBe(true);
      expect(parsed.data?.confirm).toBe(true);
    },
  );
});
