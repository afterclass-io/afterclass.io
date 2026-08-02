import { createTRPCRouter } from "@/server/api/trpc";

import { upsert } from "./upsert";
import { getByRoadmapId } from "./getByRoadmapId";

export const roadmapReactionsRouter = createTRPCRouter({
  upsert,
  getByRoadmapId,
});
