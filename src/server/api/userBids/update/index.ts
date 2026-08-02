import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";

/**
 * Full edit of an existing bid: amount, notes, and — unlike `upsert` — also
 * the target class (course/section) and bid window.
 *
 * Validation:
 * - The bid must belong to the current user.
 * - When `classId`/`bidWindowId` change, the class must exist and belong to
 *   the same academic term as the bid window (a bid for term A cannot point
 *   at a class from term B).
 *
 * There is no composite FK from `user_bid` to `bid_result`/`bid_prediction`
 * (dropped in migration 20260731150551), so moving a bid to another
 * class/window cannot violate a foreign key — result lookups simply yield no
 * row until results exist for the new (window, class) pair.
 */
export const update = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      classId: z.string().optional(),
      bidWindowId: z.number().int().positive().optional(),
      bidAmount: z.number().positive().max(99999).optional(),
      notes: z.string().max(500).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const bid = await ctx.db.userBid.findUnique({
      where: { id: input.id },
    });

    if (!bid || bid.userId !== ctx.session.user.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const nextClassId = input.classId ?? bid.classId;
    const nextBidWindowId = input.bidWindowId ?? bid.bidWindowId;

    // When the class or window changes, make sure the pair is valid and
    // belongs to one term.
    if (nextClassId !== bid.classId || nextBidWindowId !== bid.bidWindowId) {
      const [cls, window] = await Promise.all([
        ctx.db.classes.findUnique({
          where: { id: nextClassId },
          select: { acadTermId: true },
        }),
        ctx.db.bidWindow.findUnique({
          where: { id: nextBidWindowId },
          select: { acadTermId: true },
        }),
      ]);

      if (!cls || !window) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown class or bid window",
        });
      }
      if (cls.acadTermId !== window.acadTermId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Class and bid window belong to different terms",
        });
      }
    }

    return ctx.db.userBid.update({
      where: { id: input.id },
      data: {
        ...(input.classId !== undefined && { classId: input.classId }),
        ...(input.bidWindowId !== undefined && {
          bidWindowId: input.bidWindowId,
        }),
        ...(input.bidAmount !== undefined && { bidAmount: input.bidAmount }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
    });
  });
