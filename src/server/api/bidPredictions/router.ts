import { getBy } from "@/server/api/bidPredictions/getBy";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidPredictionsRouter = createTRPCRouter({
  getBy,
});
