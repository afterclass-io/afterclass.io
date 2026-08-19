import { protectedProcedure } from "@/server/api/trpc";

/**
 * List every bid the current user has saved, joined with:
 * - the bid window (round/window/dates + term)
 * - the class (section, course code/name, professor name)
 */
export const listMine = protectedProcedure.query(async ({ ctx }) => {
  const bids = await ctx.db.userBid.findMany({
    where: { userId: ctx.session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      bidWindow: {
        select: {
          acadTermId: true,
          round: true,
          window: true,
        },
      },
      class: {
        select: {
          id: true,
          section: true,
          course: { select: { code: true, name: true } },
          professor: { select: { name: true } },
        },
      },
    },
  });

  return bids.map((bid) => {
    return {
      id: bid.id,
      classId: bid.classId,
      bidWindowId: bid.bidWindowId,
      bidAmount: bid.bidAmount,
      notes: bid.notes,
      status: bid.status,
      createdAt: bid.createdAt,
      bidWindow: bid.bidWindow,
      courseCode: bid.class.course.code,
      courseName: bid.class.course.name,
      section: bid.class.section,
      professorName: bid.class.professor?.name ?? null,
    };
  });
});
