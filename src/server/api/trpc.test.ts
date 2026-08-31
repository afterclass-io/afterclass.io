import { describe, expect, it, vi, afterEach } from "vitest";
import { z } from "zod";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const router = createTRPCRouter({
  ping: publicProcedure.query(() => "ok"),
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("timingMiddleware", () => {
  it("still resolves the procedure when the dev debug log path is active", async () => {
    // Line executes `console.debug` — silence it and assert the *return value*,
    // not the log (Testing Decisions: no asserting on log output).
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
    const caller = makeCaller(router.createCaller, {});
    await expect(caller.ping()).resolves.toBe("ok");
  });

  it("still resolves the procedure through the DEBUG_TRPC artificial delay", async () => {
    // `t._config.isDev` is true under vitest, so DEBUG_TRPC=1 enters the
    // setTimeout branch; fake timers flush it without a real wait.
    vi.stubEnv("DEBUG_TRPC", "1");
    vi.useFakeTimers();
    const caller = makeCaller(router.createCaller, {});
    const pending = caller.ping();
    await vi.runAllTimersAsync();
    await expect(pending).resolves.toBe("ok");
  });
});

describe("errorFormatter", () => {
  // createCallerFactory rethrows the raw cause without running errorFormatter
  // (verified in @trpc/server's router source), so there is no caller-level
  // seam — call the formatter off the built router's config directly.
  const formatter = (
    router._def as {
      _config: {
        errorFormatter: (o: unknown) => { data: { zodError: unknown } };
      };
    }
  )._config.errorFormatter;

  const shape = { message: "err", code: -32600, data: { code: "BAD_REQUEST" } };

  it("flattens a ZodError cause into data.zodError", () => {
    const parsed = z.object({ n: z.number() }).safeParse({ n: "not a number" });
    const zodError = parsed.error!;
    const out = formatter({ shape, error: { cause: zodError } });
    expect(out.data.zodError).toEqual(zodError.flatten());
  });

  it("leaves data.zodError null for a non-Zod cause", () => {
    const out = formatter({ shape, error: { cause: new Error("plain") } });
    expect(out.data.zodError).toBeNull();
  });
});
