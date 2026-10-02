import type { Prisma, PrismaClient } from "@/generated/prisma/client";

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
    select: {
      min: true,
      median: true,
      beforeProcessVacancy: true,
      afterProcessVacancy: true,
      classId: true,
      bidWindowId: true,
      vacancy: true,
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
          courseId: true,
          professorId: true,
          acadTermId: true,
          professor: { select: { id: true, name: true, slug: true } },
          course: { select: { id: true, code: true, name: true } },
          classTimings: {
            select: {
              dayOfWeek: true,
              startTime: true,
              endTime: true,
              venue: true,
            },
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
