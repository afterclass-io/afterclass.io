import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";
import { checkBudget } from "@/server/assistant/budget";
import { getSharedRoadmap } from "./getSharedRoadmap";
import { getSharedTimetable } from "./getSharedTimetable";

vi.mock("@/server/assistant/budget", () => ({
  checkBudget: vi.fn(),
}));

const router = createTRPCRouter({ getSharedRoadmap, getSharedTimetable });

type ProcedureName = "getSharedRoadmap" | "getSharedTimetable";

/** Builds a caller whose budget check returns `ok`; both lookup tables resolve `found`. */
function setup(ok: boolean, found: unknown = null) {
  vi.mocked(checkBudget).mockResolvedValue({
    ok,
    retryAfterSeconds: ok ? 0 : 30,
  });
  const db = {
    userRoadmap: { findUnique: vi.fn().mockResolvedValue(found) },
    userTimetable: { findUnique: vi.fn().mockResolvedValue(found) },
  };
  return { db, caller: makeCaller(router.createCaller, db) };
}

function invoke(
  name: ProcedureName,
  caller: ReturnType<typeof setup>["caller"],
) {
  return name === "getSharedRoadmap"
    ? caller.getSharedRoadmap({ token: "tok" })
    : caller.getSharedTimetable({ token: "tok" });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe.each(["getSharedRoadmap", "getSharedTimetable"] as const)(
  "sharing.%s per-client throttle",
  (name) => {
    it("throws TOO_MANY_REQUESTS and never runs the token lookup when over budget", async () => {
      const { db, caller } = setup(false);
      await expect(invoke(name, caller)).rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
      });
      expect(db.userRoadmap.findUnique).not.toHaveBeenCalled();
      expect(db.userTimetable.findUnique).not.toHaveBeenCalled();
    });

    it("checks the budget with the shared prefix, 60 per minute, read kind, keyed per client", async () => {
      // Budget passes, so the lookup runs and finds nothing (NOT_FOUND).
      const { caller } = setup(true);
      await expect(invoke(name, caller)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
      const [ctx, opts] = vi.mocked(checkBudget).mock.calls[0] ?? [];
      expect(ctx?.user.id).toMatch(/^shared:/);
      expect(opts).toEqual({
        prefix: "shared",
        limit: 60,
        windowMs: 60_000,
        kind: "read",
      });
    });

    it("throws NOT_FOUND when the budget passes but the token matches nothing", async () => {
      const { caller } = setup(true, null);
      await expect(invoke(name, caller)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });
  },
);
