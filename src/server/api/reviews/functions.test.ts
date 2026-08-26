import { describe, expect, it } from "vitest";

import { ReviewsSortBy } from "@/modules/reviews/types";
import { getOrderBy } from "./functions";

describe("getOrderBy", () => {
  it("maps every sort option to its Prisma orderBy", () => {
    expect(getOrderBy(ReviewsSortBy.LATEST)).toEqual({ createdAt: "desc" });
    expect(getOrderBy(ReviewsSortBy.TRENDING)).toEqual({
      reviewEvents: { _count: "desc" },
    });
    expect(getOrderBy(ReviewsSortBy.TOP_VIEWS)).toEqual({
      countEventViews: "desc",
    });
    expect(getOrderBy(ReviewsSortBy.TOP_VOTES)).toEqual({ countVotes: "desc" });
  });

  it("throws BAD_REQUEST for an unknown sort value", () => {
    expect(() => getOrderBy("nonsense" as ReviewsSortBy)).toThrow(
      expect.objectContaining({ code: "BAD_REQUEST" }),
    );
  });
});
