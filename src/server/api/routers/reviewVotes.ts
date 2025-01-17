import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";

export const reviewVotesRouter = createTRPCRouter({
  count: publicProcedure
    .input(
      z.object({
        reviewId: z.string(),
      }),
    )
    .query(
      async ({ input, ctx }) =>
        await ctx.db.reviewVotes.aggregate({
          _sum: {
            weight: true,
          },
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
            weight: {
              not: 0,
            },
          },
        }),
    ),

  voteOrUnvote: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        userId: z.string(),
        weight: z.number().default(1),
      }),
    )
    .mutation(
      async ({ input, ctx }) =>
        await ctx.db.reviewVotes.upsert({
          where: {
            reviewId_voterId: {
              reviewId: input.reviewId,
              voterId: input.userId,
            },
          },
          create: {
            reviewId: input.reviewId,
            voterId: input.userId,
          },
          update: {
            weight: input.weight,
          },
        }),
    ),
});
