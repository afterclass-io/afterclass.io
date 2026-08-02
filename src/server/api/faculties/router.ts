import { createTRPCRouter } from "@/server/api/trpc";

import { list } from "./list";

export const facultiesRouter = createTRPCRouter({
  list,
});
