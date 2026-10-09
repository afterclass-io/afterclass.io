import { z } from "zod";

import { TRPCError } from "@trpc/server";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";
import { assertClassInTerm } from "@/server/api/classes/assertClassInTerm";
import { assertSecuredWithinBudget } from "@/server/api/userBids/assert-budget";
import { withConflictRetry } from "@/server/api/userBids/retry-conflict";

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
      bidAmount: z.number().positive().max(99999).optional(), // sync-mirror of canonical maxBidAmount (chat-config.ts)
      notes: z.string().max(500).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const bid = await requireOwnedBid(ctx.db, input.id, ctx.session.user.id, {
      classId: true,
      bidWindowId: true,
      bidAmount: true,
      status: true,
    });

    const nextClassId = input.classId ?? bid.classId;
    const nextBidWindowId = input.bidWindowId ?? bid.bidWindowId;

    // When the class or window changes, make sure the pair is valid and
    // belongs to one term.
    if (nextClassId !== bid.classId || nextBidWindowId !== bid.bidWindowId) {
      await validateClassWindowPair(ctx.db, nextClassId, nextBidWindowId);
    }

    const data = {
      ...(input.classId !== undefined && { classId: input.classId }),
      ...(input.bidWindowId !== undefined && {
        bidWindowId: input.bidWindowId,
      }),
      ...(input.bidAmount !== undefined && { bidAmount: input.bidAmount }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };

    const amountChanged =
      input.bidAmount !== undefined && input.bidAmount !== bid.bidAmount;
    const classChanged = nextClassId !== bid.classId;

    if (bid.status === "SECURED" && (amountChanged || classChanged)) {
      return withConflictRetry(() =>
        ctx.db.$transaction(
          async (tx) => {
            // The pre-read above can be stale. Decide the budget check from
            // a read inside this Serializable transaction.
            const current = await tx.userBid.findUnique({
              where: { id: input.id },
              select: {
                userId: true,
                classId: true,
                bidAmount: true,
                status: true,
              },
            });
            if (current?.userId !== ctx.session.user.id) {
              throw new TRPCError({ code: "FORBIDDEN" });
            }
            const cls = await tx.classes.findUnique({
              where: { id: input.classId ?? current.classId },
              select: { acadTermId: true },
            });
            if (!cls) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Class not found",
              });
            }
            if (current.status === "SECURED") {
              await assertSecuredWithinBudget(
                tx,
                ctx.session.user.id,
                cls.acadTermId,
                input.bidAmount ?? current.bidAmount,
                input.id,
              );
            }
            return tx.userBid.update({
              where: { id: input.id, userId: ctx.session.user.id },
              data,
            });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        ),
      );
    }

    // Ownership already verified by requireOwnedBid above; scope the
    // in-statement where too (uniformity: the write itself is owner-scoped).
    return ctx.db.userBid.update({
      where: { id: input.id, userId: ctx.session.user.id },
      data,
    });
  });
