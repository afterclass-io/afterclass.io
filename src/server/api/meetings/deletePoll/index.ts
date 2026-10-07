import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedPoll } from "@/server/api/ownership";

export const deletePoll = protectedProcedure
  .input(z.object({ slug: z.string().min(6).max(20) }))
  .mutation(async ({ ctx, input }) => {
    const poll = await requireOwnedPoll(ctx.db, { slug: input.slug }, ctx.session.user.id, {
      id: true,
    });

    await ctx.db.meetingPoll.delete({
      where: { id: poll.id },
    });

    return { success: true };
  });
