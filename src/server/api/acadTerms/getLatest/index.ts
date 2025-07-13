import { publicProcedure } from "@/server/api/trpc";

export const getLatest = publicProcedure.query(({ ctx }) =>
  ctx.db.acadTerm.findFirst({
    orderBy: {
      startDt: "desc",
    },
  }),
);
