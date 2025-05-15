import { createTRPCRouter } from "@/server/api/trpc";

import { getAll } from "./getAll";

export const hackSubmissionRouter = createTRPCRouter({
  getAll,
});
