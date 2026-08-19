import type { Prisma, PrismaClient } from "@prisma/client";

/** Hard cap on bid results per request (was duplicated in getBy / getByCourseProfessor). */
export const BID_RESULTS_HARD_LIMIT = 200;

/**
 * Single bid-result query for the analytics page: class filter + the 5-year
 * window (Plan 4) + newest-term-first ordering + hard cap. getBy and
 * getByCourseProfessor both delegate here instead of repeating the triple.
 */
export async function findBidResults(
  db: PrismaClient,
  where: Prisma.BidResultWhereInput,
  acadYearCutoff: number,
) {
  return db.bidResult.findMany({
    where: {
      ...where,
      bidWindow: { acadTerm: { acadYearStart: { gte: acadYearCutoff } } },
    },
    include: {
      bidWindow: true,
      class: {
        include: {
          professor: { select: { name: true } },
          course: { select: { code: true, name: true } },
          classTimings: {
            select: { dayOfWeek: true, startTime: true, endTime: true },
            orderBy: { startTime: "asc" },
          },
        },
      },
    },
    orderBy: [
      { bidWindow: { acadTermId: "desc" } },
      { bidWindow: { round: "asc" } },
      { bidWindow: { window: "asc" } },
    ],
    take: BID_RESULTS_HARD_LIMIT,
  });
}
