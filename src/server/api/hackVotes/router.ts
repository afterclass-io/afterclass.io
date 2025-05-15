import { createTRPCRouter } from "@/server/api/trpc";

import { getBySubmission } from "./getBySubmission";

export const hackVotesRouter = createTRPCRouter({
  getBySubmission,
});
