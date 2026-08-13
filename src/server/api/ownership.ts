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
export async function requireOwnedRoadmap(
  db: PrismaClient,
  roadmapId: string,
  userId: string,
  select?: Prisma.UserRoadmapSelect,
) {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
  let row: any;
  if (select) {
    row = await db.userRoadmap.findUnique({
      where: { id: roadmapId },
      select: { ...select, userId: true },
    });
  } else {
    row = await db.userRoadmap.findUnique({
      where: { id: roadmapId },
    });
  }
  if (!row || row.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
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
) {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
  let row: any;
  if (select) {
    row = await db.userTimetable.findUnique({
      where: { id: timetableId },
      select: { ...select, userId: true },
    });
  } else {
    row = await db.userTimetable.findUnique({
      where: { id: timetableId },
    });
  }
  if (!row || row.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
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
) {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
  let row: any;
  if (select) {
    row = await db.userBid.findUnique({
      where: { id: bidId },
      select: { ...select, userId: true },
    });
  } else {
    row = await db.userBid.findUnique({
      where: { id: bidId },
    });
  }
  if (!row || row.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
  /* eslint-enable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any */
}

/** Mint a high-entropy capability token for share links / iCal feeds. */
export function mintToken(): string {
  return nanoid(21);
}
