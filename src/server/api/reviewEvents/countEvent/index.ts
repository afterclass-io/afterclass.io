import { ReviewEventType } from "@prisma/client";
import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";

export const countEvent = protectedProcedure
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
  );
