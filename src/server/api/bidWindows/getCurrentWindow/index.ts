import { publicProcedure } from "@/server/api/trpc";
import { getCurrentWindowLogic } from "./helpers";

export const getCurrentWindow = publicProcedure.query(async ({ ctx }) => {
  return getCurrentWindowLogic(ctx.db);
});
