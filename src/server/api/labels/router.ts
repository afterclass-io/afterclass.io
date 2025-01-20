import { createTRPCRouter } from "@/server/api/trpc";

import { getAll } from "./getAll";
import { getAllByType } from "./getAllByType";

export const labelsRouter = createTRPCRouter({
  getAll,
  getAllByType,
});
