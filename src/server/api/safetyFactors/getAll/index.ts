import { publicProcedure } from "@/server/api/trpc";

export const getAll = publicProcedure.query(({ ctx }) =>
  ctx.db.safetyFactor.findMany(),
);
