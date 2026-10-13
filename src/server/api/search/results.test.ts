import { describe, expect, it, vi } from "vitest";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { searchRouter } from "./router";

const db = { $queryRaw: vi.fn() };

describe("paged search procedures", () => {
  it("rejects invalid pagination, groups and oversized queries", async () => {
    const caller = makeCaller(searchRouter.createCaller, db, null);
    for (const input of [
      { query: "Singapore", group: "matches", cursor: -1 },
      { query: "Singapore", group: "matches", cursor: 0.5 },
      { query: "Singapore", group: "matches", limit: 51 },
      { query: "Singapore", group: "matches", limit: 0 },
      { query: "x".repeat(201), group: "matches" },
      { query: "Singapore", group: "invalid" },
    ]) {
      await expect(caller.courseResults(input as never)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      await expect(
        caller.professorResults(input as never),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("defaults to 20 SMU rows and derives statistics access from the session", async () => {
    db.$queryRaw.mockResolvedValue([{ rows: [], matches: 27n, related: 1n }]);
    for (const session of [null, { user: { id: "u1" } }]) {
      const caller = makeCaller(searchRouter.createCaller, db, session);
      for (const procedure of [caller.courseResults, caller.professorResults]) {
        db.$queryRaw.mockClear();
        const result = await procedure({
          query: "Singapore",
          group: "matches",
        });
        expect(result.totals).toEqual({ matches: 27, related: 1 });
        expect(db.$queryRaw).toHaveBeenCalledTimes(1);
        const query = db.$queryRaw.mock.calls[0]![0] as { values: unknown[] };
        expect(query.values).toContain(20);
        expect(query.values).toContain("SMU");
        expect(query.values).toContain(Boolean(session));
      }
    }
  });
});
