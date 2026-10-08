import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { Prisma } from "@/generated/prisma/client";
import { protectedProcedure } from "@/server/api/trpc";
import { requireOwnedBid } from "@/server/api/ownership";
import { assertSecuredWithinBudget } from "@/server/api/userBids/assert-budget";
import {
  demoteSiblingBids,
  syncSecuredBidToActiveTimetable,
} from "@/server/api/userBids/sync-secured";

const MAX_ATTEMPTS = 3;

// The transaction that won the conflict may still be committing. A short,
// jittered pause lets it finish, so the retry sees its rows instead of
// colliding with it again.
const pauseBeforeRetry = (attempt: number) =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, 50 * attempt + Math.floor(Math.random() * 30)),
  );

const isRetryableConflict = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  (err.code === "P2002" || err.code === "P2034");

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

    const runTx = () =>
      ctx.db.$transaction(
        async (tx) => {
          // Business rule: at most one SECURED section per course per term.
          // Different sections of the same course share the same courseId + acadTermId.
          if (input.status === "SECURED") {
            const duplicateSecured = await tx.userBid.findFirst({
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
              tx,
              ctx.session.user.id,
              cls.acadTermId,
              bid.bidAmount,
              bid.id,
            );
          }

          // TOCTOU hardening: requireOwnedBid checked ownership above; the
          // in-tx update is also scoped to the caller's row.
          const updatedBid = await tx.userBid.update({
            where: { id: input.id, userId: ctx.session.user.id },
            data: { status: input.status },
          });

          if (
            input.status === "PLANNED" ||
            input.status === "SECURED" ||
            input.status === "DROPPED" ||
            input.status === "CANCELLED"
          ) {
            await demoteSiblingBids(
              tx,
              ctx.session.user.id,
              bid.classId,
              bid.id,
            );
          }
          if (input.status === "SECURED") {
            await syncSecuredBidToActiveTimetable(
              tx,
              ctx.session.user.id,
              cls.acadTermId,
              bid.classId,
            );
          }

          return { ...updatedBid, acadTermId: cls.acadTermId };
        },
        input.status === "SECURED"
          ? { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
          : undefined,
      );

    for (let attempt = 1; ; attempt++) {
      try {
        return await runTx();
      } catch (err) {
        if (!isRetryableConflict(err)) {
          throw err;
        }
        if (attempt === MAX_ATTEMPTS) {
          throw new TRPCError({
            code: "CONFLICT",
            cause: err,
            message: "Another change is in progress. Try again.",
          });
        }
        await pauseBeforeRetry(attempt);
      }
    }
  });
