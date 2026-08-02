import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const remove = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const bid = await ctx.db.userBid.findUnique({
      where: { id: input.id },
    });

    if (!bid || bid.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    await ctx.db.userBid.delete({ where: { id: input.id } });

    return { success: true };
  });
