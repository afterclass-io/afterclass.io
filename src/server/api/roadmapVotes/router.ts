import { createTRPCRouter } from "@/server/api/trpc";

import { count } from "./count";
import { getByUser } from "./getByUser";
import { voteOrUnvote } from "./voteOrUnvote";

export const roadmapVotesRouter = createTRPCRouter({
  count,
  getByUser,
  voteOrUnvote,
});
