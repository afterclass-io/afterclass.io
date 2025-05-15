import { z } from "zod";

import { publicProcedure } from "@/server/api/trpc";

export const getBySubmission = publicProcedure
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
