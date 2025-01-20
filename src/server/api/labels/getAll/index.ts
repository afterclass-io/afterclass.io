import { type Prisma } from "@prisma/client";

import { publicProcedure } from "@/server/api/trpc";

export const getAll = publicProcedure.query(async ({ ctx }) => {
  const labels = await ctx.db.labels.findMany({
    select: {
      id: true,
      name: true,
      typeOf: true,
    } satisfies Prisma.LabelsSelect,
  });
  return labels;
});
