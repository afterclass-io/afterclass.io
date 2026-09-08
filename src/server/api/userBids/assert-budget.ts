import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@/generated/prisma/client";

/** Sum of SECURED bid amounts for a user+term, optionally excluding one bid. */
export async function spentForTerm(
  db: PrismaClient,
  userId: string,
  acadTermId: string,
  excludeBidId?: string,
): Promise<number> {
  const agg = await db.userBid.aggregate({
    _sum: { bidAmount: true },
    where: {
      userId,
      status: "SECURED",
      ...(excludeBidId ? { id: { not: excludeBidId } } : {}),
      class: { acadTermId },
    },
  });
  return agg._sum.bidAmount ?? 0;
}

/** Throw if marking `bidAmount` secured would exceed the term budget. */
export async function assertSecuredWithinBudget(
  db: PrismaClient,
  userId: string,
  acadTermId: string,
  bidAmount: number,
  excludeBidId?: string,
): Promise<void> {
  const budget = await db.userBidBudget.findUnique({
    where: { userId_acadTermId: { userId, acadTermId } },
  });
  if (!budget) return; // no budget set → no cap
  const spent = await spentForTerm(db, userId, acadTermId, excludeBidId);
  if (spent + bidAmount > budget.balance) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Marking this bid as secured would exceed your budget",
    });
  }
}
