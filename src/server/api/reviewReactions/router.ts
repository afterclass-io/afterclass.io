import { createTRPCRouter } from "@/server/api/trpc";

import { upsert } from "./upsert";
import { getByReviewId } from "./getByReviewId";

export const reviewReactionsRouter = createTRPCRouter({
  upsert,
  getByReviewId,
});
