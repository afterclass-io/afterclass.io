import { createTRPCRouter } from "@/server/api/trpc";

import { getByClassIds } from "./getByClassIds";
import { listMine } from "./listMine";
import { upsert } from "./upsert";
import { update } from "./update";
import { remove } from "./remove";
import { setStatus } from "./setStatus";
import { getBudget } from "./getBudget";
import { upsertBudget } from "./upsertBudget";

export const userBidsRouter = createTRPCRouter({
  getByClassIds,
  listMine,
  upsert,
  update,
  remove,
  setStatus,
  getBudget,
  upsertBudget,
});
