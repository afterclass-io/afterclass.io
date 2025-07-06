import { getBy } from "@/server/api/bidResults/getBy";
import { createTRPCRouter } from "@/server/api/trpc";

export const bidResultsRouter = createTRPCRouter({
  getBy,
});
