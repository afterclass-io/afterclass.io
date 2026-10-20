import { dataProcedure } from "@/server/api/trpc";
import { getCurrentWindowLogic } from "./helpers";

export const getCurrentWindow = dataProcedure("classData").query(
  async ({ ctx }) => {
    return getCurrentWindowLogic(ctx.db);
  },
);
