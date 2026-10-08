import { createTRPCRouter } from "@/server/api/trpc";

import { getByClassIds } from "./getByClassIds";
import { listMine } from "./listMine";
import { upsert } from "./upsert";
import { upsertMany } from "./upsertMany";
import { update } from "./update";
import { remove } from "./remove";
import { setStatus } from "./setStatus";
import { getBudget } from "./getBudget";
import { upsertBudget } from "./upsertBudget";

export const userBidsRouter = createTRPCRouter({
  getByClassIds,
  listMine,
  upsert,
  upsertMany,
  update,
  remove,
  setStatus,
  getBudget,
  upsertBudget,
});
