import { protectedProcedure } from "@/server/api/trpc";

/**
 * List every bid the current user has saved, joined with:
 * - the bid window (round/window/dates + term)
 * - the class (section, course code/name, professor name)
 * - the actual bid result for that class in the bid's own window
 *   (median/min clearing bids from `bid_result`), when results for that
 *   window have been published.
 */
export const listMine = protectedProcedure.query(async ({ ctx }) => {
  const bids = await ctx.db.userBid.findMany({
    where: { userId: ctx.session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      bidWindow: {
        select: {
          id: true,
          acadTermId: true,
          round: true,
          window: true,
          opensAt: true,
          closesAt: true,
          resultsAt: true,
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

  // Actual outcomes per (bidWindowId, classId) — only exist once results for
  // that window are out; upcoming/current windows yield no row.
  const bidResults = bids.length
    ? await ctx.db.bidResult.findMany({
        where: {
          OR: bids.map((b) => ({
            bidWindowId: b.bidWindowId,
            classId: b.classId,
          })),
        },
        select: {
          bidWindowId: true,
          classId: true,
          median: true,
          min: true,
        },
      })
    : [];

  const resultKey = (bidWindowId: number, classId: string) =>
    `${bidWindowId}:${classId}`;
  const resultByKey = new Map(
    bidResults.map((r) => [resultKey(r.bidWindowId, r.classId), r]),
  );

  return bids.map((bid) => {
    const result = resultByKey.get(resultKey(bid.bidWindowId, bid.classId));
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
      bidResult: result ? { median: result.median, min: result.min } : null,
    };
  });
});
