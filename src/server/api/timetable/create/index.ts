import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { isUniqueConstraintViolation } from "@/server/db-errors";
import { autoName } from "./helpers";

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

    const data = {
      userId: ctx.session.user.id,
      acadTermId: input.acadTermId,
      name,
      isActive: isFirst,
    };

    try {
      return await ctx.db.userTimetable.create({ data });
    } catch (err) {
      if (isUniqueConstraintViolation(err) && isFirst) {
        const winner = await ctx.db.userTimetable.findFirst({
          where: {
            userId: ctx.session.user.id,
            acadTermId: input.acadTermId,
            isActive: true,
          },
        });
        if (winner) {
          return winner;
        }
      }
      throw err;
    }
  });
