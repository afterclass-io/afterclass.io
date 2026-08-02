import type { PrismaClient } from "@prisma/client";

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
