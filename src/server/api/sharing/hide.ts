import type { Prisma } from "@/generated/prisma/client";
import { Visibility } from "@/generated/prisma/enums";

/**
 * The single "make private" path for roadmaps: off the gallery, the public
 * page and every share link. Used by the owner (unpublish, set PRIVATE) and
 * by moderation; callers do their own authorization. Idempotent — a missing
 * row is a no-op. The owner may republish later (a new token is minted).
 */
export async function hideRoadmap(
  db: Prisma.TransactionClient,
  roadmapId: string,
): Promise<void> {
  await db.userRoadmap.updateMany({
    where: { id: roadmapId },
    data: {
      visibility: Visibility.PRIVATE,
      slug: null,
      publishedAt: null,
      shareToken: null,
    },
  });
}

/**
 * The single "make private" path for timetables: revokes the share link and
 * the calendar feed token. Same contract as hideRoadmap.
 */
export async function hideTimetable(
  db: Prisma.TransactionClient,
  timetableId: string,
): Promise<void> {
  await db.userTimetable.updateMany({
    where: { id: timetableId },
    data: { visibility: Visibility.PRIVATE, shareToken: null, icalToken: null },
  });
}
