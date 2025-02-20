import { ReviewEventType } from "@prisma/client";
import { z } from "zod";

import { rotatingSaltStartOfHour, uuid } from "@/common/functions/crypto";

import { protectedProcedure } from "@/server/api/trpc";

export const track = protectedProcedure
  .input(
    z.object({
      reviewId: z.string(),
      eventType: z.nativeEnum(ReviewEventType),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const eventId = uuid(
      input.reviewId,
      input.eventType,
      ctx.session.user.id,
      rotatingSaltStartOfHour(),
    );
    return await ctx.db.reviewEvents.upsert({
      where: { id: eventId },
      update: {},
      create: {
        id: eventId,
        eventType: input.eventType,
        reviewId: input.reviewId,
        triggeringUserId: ctx.session.user.id,
      },
    });
  });
