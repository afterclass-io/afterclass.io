import { TRPCError } from "@trpc/server";
import type { PrismaClient, Prisma } from "@prisma/client";
import { nanoid } from "nanoid";

/**
 * Shared ownership guards + capability-token minting. The
 * `findUnique` + `userId !== session.user.id` + FORBIDDEN idiom was
 * previously hand-written in ~16 procedures; new/rewritten procedures use
 * these helpers instead of repeating it.
 *
 * Each guard accepts an optional `select` to scope the fetch (the
 * ownership check always forces `userId: true` into the select so the
 * comparison works). Without `select` the full row is returned (backward-
 * compatible).
 */

// -- requireOwnedRoadmap ---------------------------------------------------

export async function requireOwnedRoadmap(
  db: PrismaClient,
  roadmapId: string,
  userId: string,
): Promise<
  NonNullable<
    Awaited<ReturnType<PrismaClient["userRoadmap"]["findUnique"]>>
  >
>;
export async function requireOwnedRoadmap<
  Select extends Prisma.UserRoadmapSelect,
>(
  db: PrismaClient,
  roadmapId: string,
  userId: string,
  select: Select,
): Promise<Prisma.UserRoadmapGetPayload<{ select: Select }>>;
// The overloads above carry the precise public return types; the
// implementation only relies on `userId`, so its return stays opaque
// (unknown, not any) to satisfy overload compatibility.
export async function requireOwnedRoadmap(
  db: PrismaClient,
  roadmapId: string,
  userId: string,
  select?: Prisma.UserRoadmapSelect,
): Promise<unknown> {
  // Only `userId` is needed for the ownership check; the overloads give
  // callers the precise payload type for their `select`.
  const row: { userId: string } | null = select
    ? await db.userRoadmap.findUnique({
        where: { id: roadmapId },
        select: { ...select, userId: true },
      })
    : await db.userRoadmap.findUnique({
        where: { id: roadmapId },
      });
  if (row?.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
}

// -- requireOwnedTimetable -------------------------------------------------

export async function requireOwnedTimetable(
  db: PrismaClient,
  timetableId: string,
  userId: string,
): Promise<
  NonNullable<
    Awaited<ReturnType<PrismaClient["userTimetable"]["findUnique"]>>
  >
>;
export async function requireOwnedTimetable<
  Select extends Prisma.UserTimetableSelect,
>(
  db: PrismaClient,
  timetableId: string,
  userId: string,
  select: Select,
): Promise<Prisma.UserTimetableGetPayload<{ select: Select }>>;
export async function requireOwnedTimetable(
  db: PrismaClient,
  timetableId: string,
  userId: string,
  select?: Prisma.UserTimetableSelect,
): Promise<unknown> {
  const row: { userId: string } | null = select
    ? await db.userTimetable.findUnique({
        where: { id: timetableId },
        select: { ...select, userId: true },
      })
    : await db.userTimetable.findUnique({
        where: { id: timetableId },
      });
  if (row?.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
}

// -- requireOwnedBid -------------------------------------------------------

export async function requireOwnedBid(
  db: PrismaClient,
  bidId: string,
  userId: string,
): Promise<
  NonNullable<Awaited<ReturnType<PrismaClient["userBid"]["findUnique"]>>>
>;
export async function requireOwnedBid<Select extends Prisma.UserBidSelect>(
  db: PrismaClient,
  bidId: string,
  userId: string,
  select: Select,
): Promise<Prisma.UserBidGetPayload<{ select: Select }>>;
export async function requireOwnedBid(
  db: PrismaClient,
  bidId: string,
  userId: string,
  select?: Prisma.UserBidSelect,
): Promise<unknown> {
  const row: { userId: string } | null = select
    ? await db.userBid.findUnique({
        where: { id: bidId },
        select: { ...select, userId: true },
      })
    : await db.userBid.findUnique({
        where: { id: bidId },
      });
  if (row?.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
}

/** Mint a high-entropy capability token for share links / iCal feeds. */
export function mintToken(): string {
  return nanoid(21);
}
