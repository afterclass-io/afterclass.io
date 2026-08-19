import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";

export const remove = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await requireOwnedBid(ctx.db, input.id, ctx.session.user.id, {
      userId: true,
    });

    await ctx.db.userBid.delete({ where: { id: input.id } });

    return { success: true };
  });
