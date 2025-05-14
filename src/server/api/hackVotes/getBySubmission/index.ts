import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const getBySubmission = protectedProcedure
  .input(
    z.object({
      hackSubmissionId: z.string().optional(),
    }),
  )
  .query(async ({ input, ctx }) => {
    return await ctx.db.hackSubmissionVote.findMany({
      where: {
        hackSubmissionId: input.hackSubmissionId,
      },
    });
  });
