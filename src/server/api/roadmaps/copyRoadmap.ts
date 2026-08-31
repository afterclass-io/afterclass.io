import { Visibility } from "@/generated/prisma/enums";
import type { PrismaClient } from "@/generated/prisma/client";

const ENTRY_SELECT = {
  courseId: true,
  yearNumber: true,
  term: true,
  sortOrder: true,
} as const;

/**
 * Load a roadmap source for copying by id (public+published only) or
 * shareToken (access-secret — private allowed). Shared by copyPublic /
 * copyShared. The id variant preserves copyPublic's public-only rule.
 */
export async function loadCopyableRoadmap(
  db: PrismaClient,
  where: { id: string } | { shareToken: string },
) {
  if ("id" in where) {
    return db.userRoadmap.findFirst({
      where: {
        id: where.id,
        visibility: Visibility.PUBLIC,
        publishedAt: { not: null },
      },
      include: { entries: { select: ENTRY_SELECT } },
    });
  }
  return db.userRoadmap.findUnique({
    where: { shareToken: where.shareToken },
    include: { entries: { select: ENTRY_SELECT } },
  });
}

/** The subset of a roadmap needed to clone it into another account. */
export type CopyableRoadmap = {
  name: string;
  description: string | null;
  entries: {
    courseId: string;
    yearNumber: number;
    term: string;
    sortOrder: number;
  }[];
};

/**
 * Clone a roadmap (name + " (copy)", description, and all entries) into a
 * user's account. Shared by `copyPublic` and `copyShared` so both entry
 * points produce identical copies.
 */
export async function copyRoadmapToUser(
  db: PrismaClient,
  source: CopyableRoadmap,
  userId: string,
) {
  return db.userRoadmap.create({
    data: {
      userId,
      name: `${source.name} (copy)`,
      description: source.description,
      entries: {
        createMany: {
          data: source.entries.map((e) => ({
            courseId: e.courseId,
            yearNumber: e.yearNumber,
            term: e.term,
            sortOrder: e.sortOrder,
          })),
        },
      },
    },
    include: {
      entries: {
        include: {
          course: {
            select: { code: true, name: true, creditUnits: true },
          },
        },
      },
    },
  });
}
