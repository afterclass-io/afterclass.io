import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";
import { assertSecuredWithinBudget } from "@/server/api/userBids/assert-budget";
import {
  demoteSiblingBids,
  syncSecuredBidToActiveTimetable,
} from "@/server/api/userBids/sync-secured";

export const setStatus = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      status: z.enum([
        "PLANNED",
        "SECURED",
        "PARTICIPATED",
        "DROPPED",
        "CANCELLED",
      ]),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const bid = await requireOwnedBid(ctx.db, input.id, ctx.session.user.id, {
      id: true,
      classId: true,
      bidAmount: true,
    });

    const cls = await ctx.db.classes.findUnique({
      where: { id: bid.classId },
      select: { acadTermId: true, courseId: true },
    });
    if (!cls) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Class not found" });
    }

    // Business rule: at most one SECURED section per course per term.
    // Different sections of the same course share the same courseId + acadTermId.
    if (input.status === "SECURED") {
      const duplicateSecured = await ctx.db.userBid.findFirst({
        where: {
          userId: ctx.session.user.id,
          status: "SECURED",
          id: { not: bid.id },
          class: { courseId: cls.courseId, acadTermId: cls.acadTermId },
        },
        select: { id: true },
      });
      if (duplicateSecured) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "You already have a secured section for this course in this term. Drop the existing section before securing another.",
        });
      }
      await assertSecuredWithinBudget(
        ctx.db,
        ctx.session.user.id,
        cls.acadTermId,
        bid.bidAmount,
        bid.id,
      );
    }

    // All-or-nothing: update the status, demote sibling bids to PARTICIPATED
    // (one active row per class) and, when securing, mirror the class onto
    // the user's active timetable for the term.
    const isP2002 = (err: unknown) =>
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002";

    const runTx = () =>
      ctx.db.$transaction(async (tx) => {
        const updatedBid = await tx.userBid.update({
          where: { id: input.id },
          data: { status: input.status },
        });

        if (
          input.status === "PLANNED" ||
          input.status === "SECURED" ||
          input.status === "DROPPED" ||
          input.status === "CANCELLED"
        ) {
          await demoteSiblingBids(tx, ctx.session.user.id, bid.classId, bid.id);
        }
        if (input.status === "SECURED") {
          await syncSecuredBidToActiveTimetable(
            tx,
            ctx.session.user.id,
            cls.acadTermId,
            bid.classId,
          );
        }

        return updatedBid;
      });

    let updated;
    try {
      updated = await runTx();
    } catch (err) {
      if (!isP2002(err)) throw err;
      // Concurrent SECURED for same user+term raced to create the active
      // timetable: the loser's findOrCreateActivePlan inside the interactive
      // tx hit the partial unique index `user_timetable_one_active_per_term`.
      // Postgres aborts the interactive tx on error, so we must retry the
      // whole transaction; the winner's row now exists and findFirst will
      // return it. See syncProgress P2002 pattern.
      updated = await runTx();
    }

    return updated;
  });
