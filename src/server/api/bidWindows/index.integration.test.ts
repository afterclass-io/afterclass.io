import { beforeAll, describe, expect, it } from "vitest";

import { idb as db, seedAcadTerm } from "@/server/api/integration-test-helpers";
import { makeCaller } from "@/server/api/trpc-test-helpers";
import { createTRPCRouter } from "@/server/api/trpc";

import { getByAcadTerm } from "./getByAcadTerm";
import { getCurrentWindow } from "./getCurrentWindow";

const router = createTRPCRouter({ getByAcadTerm, getCurrentWindow });

const call = () => makeCaller(router.createCaller, db, null);

let term: string;

beforeAll(async () => {
  term = (await seedAcadTerm(db)).id;
  // Insert out of order to prove the nested `[round asc, window asc]` sort.
  await Promise.all(
    [
      { round: "2", window: 1 },
      { round: "1", window: 2 },
      { round: "1", window: 1 },
    ].map((w) =>
      db.bidWindow.create({
        data: { acadTermId: term, ...w, resultsAt: new Date("2024-09-01") },
      }),
    ),
  );
});

describe("bidWindows.getByAcadTerm (integration)", () => {
  it("returns the term's windows ordered by round then window", async () => {
    const res = await call().getByAcadTerm({ acadTermId: term });
    expect(res.map((w) => [w.round, w.window])).toEqual([
      ["1", 1],
      ["1", 2],
      ["2", 1],
    ]);
    expect(res.every((w) => w.acadTermId === term)).toBe(true);
  });

  it("throws NOT_FOUND for an unknown term", async () => {
    await expect(
      call().getByAcadTerm({ acadTermId: "AY-does-not-exist" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("bidWindows.getCurrentWindow (integration)", () => {
  it("resolves to null or a window row without throwing", async () => {
    const res = await call().getCurrentWindow();
    expect(res === null || typeof res.id === "number").toBe(true);
  });
});
