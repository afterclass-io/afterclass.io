import { describe, expect, it, vi } from "vitest";

import type { RouterCaller } from "../types";
import { _fetchAcadTerms } from "@/common/tools/acad-term";
import { buildRoadmapView } from "./roadmap-view-shared";

const term = (
  id: string,
  acadYearStart: number,
  name: string,
  start: string,
) => ({
  id,
  acadYearStart,
  acadYearEnd: acadYearStart + 1,
  term: name,
  label: `AY${acadYearStart}/${acadYearStart + 1} ${name}`,
  startDt: new Date(start),
  endDt: new Date(start),
});

const TERMS = [
  term("2024-t1", 2024, "T1", "2024-08-12"),
  term("2024-t2", 2024, "T2", "2025-01-13"),
  term("2025-t1", 2025, "T1", "2025-08-11"),
];

function makeCaller(opts: {
  matricTermId: string | null;
  currentId: string | null;
  list?: () => Promise<unknown>;
}): RouterCaller {
  return {
    roadmaps: {
      getMine: vi.fn().mockResolvedValue({
        roadmap: {
          id: "r1",
          name: "Plan",
          matricTermId: opts.matricTermId,
          shareToken: "secret-token",
        },
        entries: [],
      }),
    },
    acadTerms: {
      list: vi.fn(opts.list ?? (() => Promise.resolve(TERMS))),
      current: vi
        .fn()
        .mockResolvedValue(opts.currentId ? { id: opts.currentId } : null),
    },
  } as unknown as RouterCaller;
}

describe("buildRoadmapView position", () => {
  it("resolves the year and term of the current semester from acadTerms.list", async () => {
    const view = await buildRoadmapView(
      makeCaller({ matricTermId: "2024-t1", currentId: "2025-t1" }),
      "r1",
    );
    expect(view.position).toEqual({ yearNumber: 2, term: "T1" });
  });

  it("returns a null position when the roadmap has no matriculation term", async () => {
    const view = await buildRoadmapView(
      makeCaller({ matricTermId: null, currentId: "2025-t1" }),
      "r1",
    );
    expect(view.position).toBeNull();
  });

  it("returns a null position when there is no current term", async () => {
    const view = await buildRoadmapView(
      makeCaller({ matricTermId: "2024-t1", currentId: null }),
      "r1",
    );
    expect(view.position).toBeNull();
  });

  it("returns a null position when the term list fails", async () => {
    const view = await buildRoadmapView(
      makeCaller({
        matricTermId: "2024-t1",
        currentId: "2025-t1",
        list: () => Promise.reject(new Error("db down")),
      }),
      "r1",
    );
    expect(view.position).toBeNull();
  });

  it("never exposes the share token", async () => {
    const view = await buildRoadmapView(
      makeCaller({ matricTermId: "2024-t1", currentId: "2025-t1" }),
      "r1",
    );
    expect(JSON.stringify(view)).not.toContain("secret-token");
  });
});

describe("buildRoadmapView position with the real term list", () => {
  it("resolves the position from what acadTerms.list actually returns", async () => {
    // The same rows `listAcadTerms` reads from the database.
    const rows = TERMS.map((t) => ({
      id: t.id,
      acadYearStart: t.acadYearStart,
      acadYearEnd: t.acadYearEnd,
      term: t.term,
      startDt: t.startDt,
      endDt: t.endDt,
    }));
    const findMany = vi.fn().mockResolvedValue(rows);
    const view = await buildRoadmapView(
      makeCaller({
        matricTermId: "2024-t1",
        currentId: "2025-t1",
        list: () => _fetchAcadTerms({ acadTerm: { findMany } }),
      }),
      "r1",
    );
    expect(view.position).toEqual({ yearNumber: 2, term: "T1" });
  });
});
