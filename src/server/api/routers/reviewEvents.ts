import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { ReviewEventType } from "@prisma/client";
import { rotatingSaltStartOfHour, uuid } from "@/common/functions/crypto";

export const reviewEventsRouter = createTRPCRouter({
  track: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        eventType: z.nativeEnum(ReviewEventType),
        triggeringUserId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const eventId = uuid(
        input.reviewId,
        input.eventType,
        input.triggeringUserId ?? "",
        rotatingSaltStartOfHour(),
      );
      return await ctx.db.reviewEvents.upsert({
        where: { id: eventId },
        update: {},
        create: {
          id: eventId,
          eventType: input.eventType,
          reviewId: input.reviewId,
          triggeringUserId: input.triggeringUserId,
        },
      });
    }),

  countEvent: protectedProcedure
    .input(
      z.object({
        reviewId: z.string(),
        eventType: z.nativeEnum(ReviewEventType),
      }),
    )
    .query(
      async ({ ctx, input }) =>
        await ctx.db.reviewEvents.count({
          where: {
            reviewId: input.reviewId,
            eventType: input.eventType,
          },
        }),
    ),
});
