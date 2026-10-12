import { z } from "zod";

import { protectedProcedure } from "@/server/api/trpc";
import {
  bidAmountSchema,
  bidNotesSchema,
} from "@/server/api/userBids/bid-input";
import { validateClassWindowPair } from "@/server/api/userBids/validate-class-window";

export const upsert = protectedProcedure
  .input(
    z.object({
      classId: z.string(),
      bidWindowId: z.number().int().positive(),
      bidAmount: bidAmountSchema,
      notes: bidNotesSchema.optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    await validateClassWindowPair(ctx.db, input.classId, input.bidWindowId);

    return ctx.db.userBid.upsert({
      where: {
        userId_classId_bidWindowId: {
          userId: ctx.session.user.id,
          classId: input.classId,
          bidWindowId: input.bidWindowId,
        },
      },
      update: {
        bidAmount: input.bidAmount,
        notes: input.notes,
      },
      create: {
        userId: ctx.session.user.id,
        classId: input.classId,
        bidWindowId: input.bidWindowId,
        bidAmount: input.bidAmount,
        notes: input.notes,
        status: "PLANNED",
      },
    });
  });
