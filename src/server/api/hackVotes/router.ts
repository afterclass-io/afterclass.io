import { createTRPCRouter } from "@/server/api/trpc";

import { getBySubmission } from "./getBySubmission";
import { voteOrUnvote } from "./voteOrUnvote";

export const hackVotesRouter = createTRPCRouter({
  getBySubmission,
  voteOrUnvote,
});
