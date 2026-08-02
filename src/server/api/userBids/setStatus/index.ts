import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

export const setStatus = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      status: z.enum(["PLANNED", "SECURED", "MISSED", "DROPPED", "CANCELLED"]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const bid = await ctx.db.userBid.findUnique({
      where: { id: input.id },
    });

    if (!bid || bid.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return ctx.db.userBid.update({
      where: { id: input.id },
      data: { status: input.status },
    });
  });
