import type { PrismaClient } from "@/generated/prisma/client";
import { requirePublicRoadmap } from "@/server/api/roadmaps/requirePublicRoadmap";
import { checkAndIncrement, clientKey } from "@/server/api/engagement-limit";

type EngagementField = "viewCount" | "shareCount";

/**
 * Rate-limited increment for public-roadmap engagement counters.
 * Shared by recordView / recordShare (previously byte-identical pairs).
 */
export async function incrementEngagement(
  db: PrismaClient,
  input: { roadmapId: string; field: EngagementField },
  headers: Headers,
): Promise<boolean> {
  await requirePublicRoadmap(db, input.roadmapId);

  const key = `${input.roadmapId}:${input.field}:${clientKey(headers)}`;
  if (!checkAndIncrement(key, 5, 60_000)) {
    return false;
  }

  await db.userRoadmap.updateMany({
    where: { id: input.roadmapId, visibility: "PUBLIC" },
    data: { [input.field]: { increment: 1 } },
  });

  return true;
}
