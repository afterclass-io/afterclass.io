import { protectedProcedure } from "@/server/api/trpc";

export const listMine = protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.userRoadmap.findMany({
    where: { userId: ctx.session.user.id },
    select: {
      id: true,
      name: true,
      description: true,
      visibility: true,
      shareToken: true,
      slug: true,
      publishedAt: true,
      isActive: true,
      matricTermId: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { entries: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
});
