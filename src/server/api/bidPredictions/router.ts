import { getBy } from "@/server/api/bidPredictions/getBy";
import { getByClassIds } from "@/server/api/bidPredictions/getByClassIds";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidPredictionsRouter = createTRPCRouter({
  getBy,
  getByClassIds,
});
