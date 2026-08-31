import type { Prisma } from "@/generated/prisma/client";
import { Visibility } from "@/generated/prisma/enums";

import { publicProcedure } from "@/server/api/trpc";

import { listPublicInput } from "./input";

export const listPublic = publicProcedure.input(listPublicInput).query(async ({ ctx, input }) => {
  const { cursor, limit, facultyId, query, sort } = input;

  const where: Prisma.UserRoadmapWhereInput = {
    visibility: Visibility.PUBLIC,
    publishedAt: { not: null },
    ...(facultyId !== undefined ? { facultyId } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // only upvotes (weight = 1) count towards a roadmap's "likes"
  // Intentionally omits shareToken — it's an access secret, not display data.
  const select = {
    id: true,
    name: true,
    description: true,
    slug: true,
    facultyId: true,
    visibility: true,
    publishedAt: true,
    viewCount: true,
    shareCount: true,
    isActive: true,
    userId: true,
    user: {
      select: { username: true },
    },
    _count: {
      select: { entries: true, votes: { where: { weight: 1 } } },
    },
  } satisfies Prisma.UserRoadmapSelect;

  const orderBy:
    | Prisma.UserRoadmapOrderByWithRelationInput
    | Prisma.UserRoadmapOrderByWithRelationInput[] =
    sort === "most-liked"
      ? [{ upvoteCount: "desc" }, { publishedAt: "desc" }, { id: "desc" }]
      : sort === "most-viewed"
        ? [{ viewCount: "desc" }, { publishedAt: "desc" }, { id: "desc" }]
        : [{ publishedAt: "desc" }, { id: "desc" }];

  const roadmaps = await ctx.db.userRoadmap.findMany({
    where,
    select,
    orderBy,
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  let nextCursor: string | null = null;
  if (roadmaps.length > limit) {
    roadmaps.pop();
    nextCursor = roadmaps[roadmaps.length - 1]!.id;
  }

  // facultyId is a plain snapshot column (no Prisma relation), so resolve
  // faculty names for the returned page in a separate lookup.
  const facultyIds = [
    ...new Set(roadmaps.map((r) => r.facultyId).filter((id): id is number => id !== null)),
  ];
  const faculties = facultyIds.length
    ? await ctx.db.faculties.findMany({
        where: { id: { in: facultyIds } },
        select: { id: true, name: true, acronym: true },
      })
    : [];
  const facultyById = new Map(faculties.map((f) => [f.id, f]));

  const items = roadmaps.map((r) => ({
    roadmap: r,
    ownerUsername: r.user.username,
    entryCount: r._count.entries,
    voteCount: r._count.votes,
    faculty: r.facultyId !== null ? (facultyById.get(r.facultyId) ?? null) : null,
  }));

  return { items, nextCursor };
});
