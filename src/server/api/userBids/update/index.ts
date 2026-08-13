import { z } from "zod";

import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";
import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";

/**
 * A bid's class and bid window must exist and belong to the SAME academic
 * term (a bid for term A cannot point at a class from term B).
 */
async function validateClassWindowPair(
  db: PrismaClient,
  classId: string,
  bidWindowId: number,
): Promise<void> {
  const window = await db.bidWindow.findUnique({
    where: { id: bidWindowId },
    select: { acadTermId: true },
  });
  if (!window) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown bid window" });
  }
  await assertClassInTerm(db, classId, window.acadTermId);
}

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
 * (dropped in migration 20260807151531_drop_user_bid_results_composite_fks), so moving a bid to another
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
    const bid = await requireOwnedBid(ctx.db, input.id, ctx.session.user.id, {
      classId: true,
      bidWindowId: true,
    });

    const nextClassId = input.classId ?? bid.classId;
    const nextBidWindowId = input.bidWindowId ?? bid.bidWindowId;

    // When the class or window changes, make sure the pair is valid and
    // belongs to one term.
    if (nextClassId !== bid.classId || nextBidWindowId !== bid.bidWindowId) {
      await validateClassWindowPair(ctx.db, nextClassId, nextBidWindowId);
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
