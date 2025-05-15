import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      hackSubmissionId: z.string(),
      weight: z.number(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.db.hackSubmissionVote.upsert({
      where: {
        hackSubmissionId_voterId: {
          hackSubmissionId: input.hackSubmissionId,
          voterId: ctx.session.user.id,
        },
      },
      create: {
        hackSubmissionId: input.hackSubmissionId,
        voterId: ctx.session.user.id,
        weight: input.weight,
      },
      update: {
        weight: input.weight,
      },
    });
  });
