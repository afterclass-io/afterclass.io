import { publicProcedure } from "@/server/api/trpc";

export const getLatest = publicProcedure.query(({ ctx }) =>
  ctx.db.acadTerm.findMany({
    orderBy: {
      startDt: "desc",
    },
    take: 1,
  }),
);
