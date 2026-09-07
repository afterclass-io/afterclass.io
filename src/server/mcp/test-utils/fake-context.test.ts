import { describe, expect, it, vi } from "vitest";

// `server-only` throws outside a Next.js server bundle — stub as no-op
// (established pattern: caller.test.ts, adapters.test.ts, tools.test.ts).
vi.mock("server-only", () => ({}));

import { makeFakeToolContext } from "./fake-context";
import { assertAllWriteRoutersStubbed } from "./fake-context";
import { createCallerForUser } from "../caller";

describe("makeFakeToolContext", () => {
  it("builds a full RouterCaller-backed context", async () => {
    const ctx = await makeFakeToolContext();
    expect(ctx.user?.id).toBeTruthy();
    expect(typeof (ctx.caller as Record<string, unknown>).reviews).toBe(
      "object",
    );
  });

  it("wraps createCallerForUser with the default fake user (id u1)", async () => {
    const ctx = await makeFakeToolContext();
    expect(ctx.user.id).toBe("u1");
    expect(ctx.user.email).toBe("a@smu.edu.sg");
    // Full RouterCaller shape: every router namespace is present, same as
    // the real context createCallerForUser returns.
    const real = createCallerForUser(ctx.user);
    for (const ns of [
      "acadTerms",
      "bidWindows",
      "classes",
      "courses",
      "reviews",
      "roadmaps",
      "timetable",
      "userBids",
    ]) {
      expect(ctx.caller[ns as keyof typeof ctx.caller]).toBeDefined();
      expect(real.caller[ns as keyof typeof real.caller]).toBeDefined();
    }
  });

  it("applies user overrides over the default", async () => {
    const ctx = await makeFakeToolContext({
      user: { id: "u9", email: "u9@smu.edu.sg" },
    });
    expect(ctx.user.id).toBe("u9");
    expect(ctx.user.email).toBe("u9@smu.edu.sg");
  });

  it("per-router stubs win and are invokable; unstubbed procedures delegate live", async () => {
    const searchCourses = vi.fn().mockResolvedValue([{ id: "c1" }]);
    const ctx = await makeFakeToolContext({
      caller: { timetable: { searchCourses } },
    });
    const out = await ctx.caller.timetable.searchCourses({} as never);
    expect(out).toEqual([{ id: "c1" }]);
    expect(searchCourses).toHaveBeenCalledTimes(1);
    // Unstubbed namespace still delegates to the live caller (namespace +
    // procedure both present — invoking would hit the DB, so assert shape).
    expect(typeof ctx.caller.reviews).toBe("object");
  });

  it("mutations on the fake caller never leak into the real caller", async () => {
    const ctx = await makeFakeToolContext({
      caller: { timetable: { searchCourses: vi.fn() } },
    });
    const real = createCallerForUser(ctx.user);
    expect(real.caller.timetable.searchCourses).not.toBe(
      ctx.caller.timetable.searchCourses,
    );
  });

  it("the caller is never thenable (awaiting resolves the context, not the caller)", async () => {
    const ctx = await makeFakeToolContext();
    expect(
      (ctx.caller as unknown as Record<string, unknown>).then,
    ).toBeUndefined();
  });

  it("assertAllWriteRoutersStubbed passes when write procedures are stubbed, throws when missing", async () => {
    const stubbed = await makeFakeToolContext({
      caller: { userBids: { listMine: vi.fn() } },
    });
    expect(() =>
      assertAllWriteRoutersStubbed(stubbed, { userBids: ["listMine"] }),
    ).not.toThrow();
    const bare = await makeFakeToolContext();
    expect(() =>
      assertAllWriteRoutersStubbed(bare, { userBids: ["listMine"] }),
    ).toThrow(/userBids\.listMine/);
  });
});
