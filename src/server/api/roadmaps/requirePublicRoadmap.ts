import { TRPCError } from "@trpc/server";
import { Visibility } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";

/**
 * Load a roadmap that is PUBLIC and published, or throw NOT_FOUND.
 * Centralizes the "only public roadmaps can be engaged with" rule for
 * votes, reactions, and view/share counters.
 */
export async function requirePublicRoadmap(
  db: PrismaClient,
  roadmapId: string,
) {
  const roadmap = await db.userRoadmap.findFirst({
    where: {
      id: roadmapId,
      visibility: Visibility.PUBLIC,
      publishedAt: { not: null },
    },
  });

  if (!roadmap) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }

  return roadmap;
}
