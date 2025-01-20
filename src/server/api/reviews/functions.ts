import { type Prisma } from "@prisma/client";

import { ReviewsSortBy } from "@/modules/reviews/types";
import { TRPCError } from "@trpc/server";

export const getOrderBy = (sortBy: ReviewsSortBy) => {
  const DESC = "desc" as Prisma.SortOrder;

  let orderBy:
    | Prisma.ReviewsOrderByWithRelationInput
    | Prisma.ReviewsOrderByWithRelationInput[];

  switch (sortBy) {
    case ReviewsSortBy.LATEST:
      orderBy = { createdAt: DESC };
      break;
    case ReviewsSortBy.TRENDING:
      orderBy = {
        reviewEvents: {
          _count: DESC,
        },
      };
      break;
    case ReviewsSortBy.TOP_VIEWS:
      orderBy = { countEventViews: DESC };
      break;
    case ReviewsSortBy.TOP_VOTES:
      orderBy = { countVotes: DESC };
      break;
    default:
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid sort by value",
      });
  }
  return orderBy;
};
