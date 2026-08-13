import { describe, expect, it, vi } from "vitest";
import { getAcadYearCutoff, MAX_HISTORY_YEARS } from "./acad-year-window";

describe("getAcadYearCutoff", () => {
  it("keeps exactly MAX_HISTORY_YEARS distinct years (latest minus 4)", async () => {
    const db = {
      acadTerm: {
        aggregate: vi.fn().mockResolvedValue({ _max: { acadYearStart: 2026 } }),
      },
    };
    expect(MAX_HISTORY_YEARS).toBe(5);
    expect(await getAcadYearCutoff(db as never)).toBe(2022);
  });

  it("falls back to the current year when no terms exist", async () => {
    const db = {
      acadTerm: {
        aggregate: vi.fn().mockResolvedValue({ _max: { acadYearStart: null } }),
      },
    };
    const cutoff = await getAcadYearCutoff(db as never);
    expect(cutoff).toBe(new Date().getFullYear() - 4);
  });
});
