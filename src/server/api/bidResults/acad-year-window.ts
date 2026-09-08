import type { PrismaClient } from "@/generated/prisma/client";

/** Number of distinct academic years of bid history to expose. */
export const MAX_HISTORY_YEARS = 5;

/**
 * Earliest `acadYearStart` (inclusive) that should be served. Computed as
 * the latest academic year present in the data minus (MAX_HISTORY_YEARS - 1),
 * e.g. latest 2026 → cutoff 2022 (years 2022..2026). This bounds the query at
 * the DB level so the analytics page stays fast as bid_result grows.
 */
export async function getAcadYearCutoff(db: PrismaClient): Promise<number> {
  const agg = await db.acadTerm.aggregate({
    _max: { acadYearStart: true },
  });
  const latest = agg._max.acadYearStart ?? new Date().getFullYear();
  return latest - (MAX_HISTORY_YEARS - 1);
}
