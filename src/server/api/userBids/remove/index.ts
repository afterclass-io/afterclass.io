import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";

export const remove = protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const bid = await requireOwnedBid(ctx.db, input.id, ctx.session.user.id, {
      bidWindow: { select: { acadTermId: true } },
    });

    // Ownership already verified by requireOwnedBid above; scope the
    // in-statement where too (uniformity: the write itself is owner-scoped).
    await ctx.db.userBid.delete({
      where: { id: input.id, userId: ctx.session.user.id },
    });

    return {
      success: true,
      acadTermId:
        (bid as unknown as { bidWindow?: { acadTermId?: string } }).bidWindow?.acadTermId ??
        null,
    };
  });
