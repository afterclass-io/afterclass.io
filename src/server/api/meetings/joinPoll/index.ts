import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "@/server/api/trpc";

export const joinPoll = protectedProcedure
  .input(z.object({ slug: z.string().min(6).max(20) }))
  .mutation(async ({ ctx, input }) => {
    const poll = await ctx.db.meetingPoll.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });
    if (!poll) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Meeting poll not found",
      });
    }

    await ctx.db.meetingParticipant.upsert({
      where: {
        pollId_userId: { pollId: poll.id, userId: ctx.session.user.id },
      },
      update: {},
      create: { pollId: poll.id, userId: ctx.session.user.id },
    });
    return { success: true };
  });
