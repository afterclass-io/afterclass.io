import { describe, expect, it, vi } from "vitest";
import { BID_RESULTS_HARD_LIMIT, findBidResults } from "./findBidResults";

describe("findBidResults", () => {
  it("merges the class filter, 5-year window, orderBy and take", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const db = { bidResult: { findMany } };
    await findBidResults(db as never, { class: { courseId: "co1" } }, 2022);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          class: { courseId: "co1" },
          bidWindow: { acadTerm: { acadYearStart: { gte: 2022 } } },
        },
        orderBy: [
          { bidWindow: { acadTermId: "desc" } },
          { bidWindow: { round: "asc" } },
          { bidWindow: { window: "asc" } },
        ],
        take: BID_RESULTS_HARD_LIMIT,
      }),
    );
  });
});
