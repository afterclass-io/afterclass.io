import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

function autoName(plansCount: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return `Plan ${alphabet[plansCount] ?? String(plansCount)}`;
}

export const create = protectedProcedure
  .input(
    z.object({
      acadTermId: z.string(),
      name: z.string().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const existingCount = await ctx.db.userTimetable.count({
      where: {
        userId: ctx.session.user.id,
        acadTermId: input.acadTermId,
      },
    });

    const isFirst = existingCount === 0;
    const name = input.name ?? autoName(existingCount);

    return ctx.db.userTimetable.create({
      data: {
        userId: ctx.session.user.id,
        acadTermId: input.acadTermId,
        name,
        isActive: isFirst,
      },
    });
  });
