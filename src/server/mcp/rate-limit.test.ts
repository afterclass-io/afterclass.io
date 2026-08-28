import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { SessionUser } from "@/server/auth/config";
import type { McpTool, ToolContext, ToolResult } from "./types";
import { createWriteRateLimiter, withWriteRateLimit } from "./rate-limit";

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

function ctxFor(userId: string): ToolContext {
  return { user: { ...fakeUser, id: userId }, caller: {} as never };
}

function okResult(): ToolResult {
  return { content: [{ type: "text", text: "ok" }] };
}

/** Minimal write tool whose run we can spy on. */
function makeWriteTool(run: (ctx: ToolContext, input: unknown) => Promise<ToolResult>): McpTool {
  return {
    name: "fake-write",
    description: "fake write tool",
    inputSchema: z.object({}),
    run: run as McpTool["run"],
  };
}

describe("createWriteRateLimiter", () => {
  it("allows exactly perMinute calls per 60s window, then rejects with retryAfterMs", () => {
    const now = 0;
    const limiter = createWriteRateLimiter({ perMinute: 10, now: () => now });

    for (let i = 0; i < 10; i++) {
      const decision = limiter.check("u1");
      expect(decision.ok).toBe(true);
      expect(decision.remaining).toBe(9 - i);
      expect(decision.retryAfterMs).toBe(0);
    }

    const rejected = limiter.check("u1");
    expect(rejected.ok).toBe(false);
    expect(rejected.remaining).toBe(0);
    expect(rejected.retryAfterMs).toBeGreaterThan(0);
    expect(rejected.retryAfterMs).toBeLessThanOrEqual(60_000);
  });

  it("resets the budget after the 60s window elapses", () => {
    let now = 0;
    const limiter = createWriteRateLimiter({ perMinute: 10, now: () => now });
    for (let i = 0; i < 10; i++) limiter.check("u1");
    expect(limiter.check("u1").ok).toBe(false);

    now = 60_000; // next window
    expect(limiter.check("u1").ok).toBe(true);
  });

  it("keys budgets per user", () => {
    const limiter = createWriteRateLimiter({ perMinute: 2, now: () => 0 });
    limiter.check("u1");
    limiter.check("u1");
    expect(limiter.check("u1").ok).toBe(false);
    expect(limiter.check("u2").ok).toBe(true);
  });

  it("reset(userKey) clears one user; reset() clears everyone", () => {
    const limiter = createWriteRateLimiter({ perMinute: 1, now: () => 0 });
    limiter.check("u1");
    limiter.check("u2");
    expect(limiter.check("u1").ok).toBe(false);

    limiter.reset("u1");
    expect(limiter.check("u1").ok).toBe(true);
    expect(limiter.check("u2").ok).toBe(false);

    limiter.reset();
    expect(limiter.check("u2").ok).toBe(true);
  });
});

describe("withWriteRateLimit", () => {
  it("rejects the 11th write call in a minute with a friendly message without running the tool", async () => {
    const now = 0;
    const limiter = createWriteRateLimiter({ perMinute: 10, now: () => now });
    const inner = vi.fn(async (_ctx: ToolContext, _input: unknown) => okResult());
    const tool = withWriteRateLimit(makeWriteTool(inner), { perMinute: 10, limiter });

    const ctx = ctxFor("u1");
    for (let i = 0; i < 10; i++) {
      const result = await tool.run(ctx, {});
      expect(result.isError).toBeUndefined();
    }
    expect(inner).toHaveBeenCalledTimes(10);

    const rejected = await tool.run(ctx, {});
    expect(rejected.isError).toBe(true);
    expect(rejected.content[0]!.text).toMatch(/rate limit/i);
    expect(inner).toHaveBeenCalledTimes(10); // 11th call never reached the tool
  });

  it("keys the limit on the caller's user id, so another user is unaffected", async () => {
    const limiter = createWriteRateLimiter({ perMinute: 1, now: () => 0 });
    const inner = vi.fn(async (_ctx: ToolContext, _input: unknown) => okResult());
    const tool = withWriteRateLimit(makeWriteTool(inner), { perMinute: 1, limiter });

    await tool.run(ctxFor("u1"), {});
    expect((await tool.run(ctxFor("u1"), {})).isError).toBe(true);
    await tool.run(ctxFor("u2"), {});
    expect(inner).toHaveBeenCalledTimes(2);
  });

  it("creates its own limiter when none is provided (per-tool default)", async () => {
    const inner = vi.fn(async (_ctx: ToolContext, _input: unknown) => okResult());
    const tool = withWriteRateLimit(makeWriteTool(inner), { perMinute: 2 });

    await tool.run(ctxFor("u1"), {});
    await tool.run(ctxFor("u1"), {});
    expect((await tool.run(ctxFor("u1"), {})).isError).toBe(true);
    expect(inner).toHaveBeenCalledTimes(2);
  });
});
