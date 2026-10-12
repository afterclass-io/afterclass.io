import { TRPCError } from "@trpc/server";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
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

/** A missing row passes `undefined` as its owner, so it fails the check too. */
function assertOwner(ownerId: string | undefined, userId: string): void {
  if (ownerId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

// -- requireOwnedRoadmap ---------------------------------------------------

export async function requireOwnedRoadmap(
  db: PrismaClient,
  roadmapId: string,
  userId: string,
): Promise<
  NonNullable<Awaited<ReturnType<PrismaClient["userRoadmap"]["findUnique"]>>>
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
  assertOwner(row?.userId, userId);
  return row;
}

// -- requireOwnedTimetable -------------------------------------------------

export async function requireOwnedTimetable(
  db: PrismaClient,
  timetableId: string,
  userId: string,
): Promise<
  NonNullable<Awaited<ReturnType<PrismaClient["userTimetable"]["findUnique"]>>>
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
  assertOwner(row?.userId, userId);
  return row;
}

/**
 * Owner-scoped lookup that hides existence: another user's row reads as
 * missing and surfaces as NOT_FOUND. Unlike requireOwnedTimetable, which
 * reports FORBIDDEN for a row it can see but does not own.
 */
export async function findOwnedTimetableOr404(
  db: PrismaClient,
  timetableId: string,
  userId: string,
) {
  const row = await db.userTimetable.findUnique({
    where: { id: timetableId, userId },
  });
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND" });
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
  assertOwner(row?.userId, userId);
  return row;
}

// -- requireOwnedPoll ------------------------------------------------------

export async function requireOwnedPoll(
  db: PrismaClient,
  slugOrId: { slug: string } | { id: string },
  userId: string,
): Promise<
  NonNullable<Awaited<ReturnType<PrismaClient["meetingPoll"]["findUnique"]>>>
>;
export async function requireOwnedPoll<Select extends Prisma.MeetingPollSelect>(
  db: PrismaClient,
  slugOrId: { slug: string } | { id: string },
  userId: string,
  select: Select,
): Promise<Prisma.MeetingPollGetPayload<{ select: Select }>>;
export async function requireOwnedPoll(
  db: PrismaClient,
  slugOrId: { slug: string } | { id: string },
  userId: string,
  select?: Prisma.MeetingPollSelect,
): Promise<unknown> {
  const row: { creatorId: string } | null = select
    ? await db.meetingPoll.findUnique({
        where: slugOrId,
        select: { ...select, creatorId: true },
      })
    : await db.meetingPoll.findUnique({
        where: slugOrId,
      });
  assertOwner(row?.creatorId, userId);
  return row;
}

/** Mint a high-entropy capability token for share links / iCal feeds. */
export function mintToken(): string {
  return nanoid(21);
}
