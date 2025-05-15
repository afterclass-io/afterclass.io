import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export const voteOrUnvote = protectedProcedure
  .input(
    z.object({
      hackSubmissionId: z.string(),
      weight: z.union([z.literal(0), z.literal(1)]),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    input.weight = clamp(input.weight, 0, 1);
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
