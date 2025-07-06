import { getAll } from "./getAll";
import { createTRPCRouter } from "@/server/api/trpc";

export const safetyFactorsRouter = createTRPCRouter({
  getAll,
});
