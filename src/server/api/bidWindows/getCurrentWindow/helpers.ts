import type { PrismaClient, BidWindow, AcadTerm } from "@/generated/prisma/client";

export type CurrentWindowResult = (BidWindow & { acadTerm: AcadTerm }) | null;

/**
 * Determine the "current" bid window using the bid_window table as the
 * single source of truth. Returns null if no windows have dates configured.
 *
 * Algorithm (3-level fallback using timestamp comparison):
 * 1. Active: opensAt <= now < resultsAt (bidding open or awaiting results)
 * 2. Upcoming: soonest window where opensAt > now
 * 3. Past: most recent window where resultsAt <= now
 *
 * This is the SINGLE source of truth for "which bid window is current."
 * All consumers should use this function rather than sorting acad_term.startDt
 * or reimplementing their own window-matching logic.
 */
export async function getCurrentWindowLogic(
  db: PrismaClient,
): Promise<CurrentWindowResult> {
  const now = new Date();

  const allWindows = await db.bidWindow.findMany({
    where: { resultsAt: { not: null } },
    include: { acadTerm: true },
    orderBy: { opensAt: "asc" },
  });

  if (allWindows.length === 0) return null;

  // Level 1: Active window (bidding open or awaiting results)
  const active = allWindows.find(
    (bw) =>
      bw.opensAt &&
      bw.resultsAt &&
      bw.opensAt <= now &&
      now < bw.resultsAt,
  );
  if (active) return active;

  // Level 2: Next upcoming window
  const upcoming = allWindows.find(
    (bw) => bw.opensAt && bw.opensAt > now,
  );
  if (upcoming) return upcoming;

  // Level 3: Most recent past window
  const pastWindows = allWindows.filter(
    (bw) => bw.resultsAt && bw.resultsAt <= now,
  );
  if (pastWindows.length > 0) {
    return pastWindows.reduce((latest, bw) =>
      bw.resultsAt!.getTime() > latest.resultsAt!.getTime() ? bw : latest,
    );
  }

  // Fallback: return the chronologically last window
  return allWindows[allWindows.length - 1]!;
}
