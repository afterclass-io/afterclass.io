import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const reviewVotesRouter = createTRPCRouter({
  count: publicProcedure
    .input(
      z.object({
        reviewId: z.string(),
      }),
    )
    .query(
      async ({ input, ctx }) =>
        await ctx.db.reviewVotes.count({
          where: {
            reviewId: input.reviewId,
          },
        }),
    ),

  getUserVote: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        reviewId: z.string().optional(),
      }),
    )
    .query(
      async ({ input, ctx }) =>
        await ctx.db.reviewVotes.findFirst({
          where: {
            voterId: input.userId,
            reviewId: input.reviewId,
          },
        }),
    ),

  voteOrUnvote: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const like = await ctx.db.reviewVotes.findFirst({
        where: {
          reviewId: input.reviewId,
          voterId: input.userId,
        },
      });
      if (like) {
        await ctx.db.reviewVotes.delete({
          where: {
            id: like.id,
          },
        });
      } else {
        await ctx.db.reviewVotes.create({
          data: {
            reviewId: input.reviewId,
            voterId: input.userId,
          },
        });
      }
    }),
});
