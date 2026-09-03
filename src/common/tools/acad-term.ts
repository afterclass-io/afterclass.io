import { unstable_cache } from "next/cache";

// ============================================================
// Types
// ============================================================

export type AcadTermSummary = {
  id: string;
  label: string;
  startDt: Date;
  endDt: Date;
};

/** Row shape returned by AcadTerm.findMany */
type AcadTermRow = {
  id: string;
  acadYearStart: number;
  acadYearEnd: number;
  term: string;
  startDt: Date;
  endDt: Date;
};

/** Minimal Prisma delegate shape needed for term queries */
type AcadTermDelegate = {
  findMany: (args?: {
    orderBy?: { startDt: "asc" | "desc" };
  }) => Promise<AcadTermRow[]>;
};

// ============================================================
// Pure functions (testable without DB)
// ============================================================

/**
 * Format an academic term label as "AY{start}/{end} {term}".
 * e.g. `formatAcadTermLabel(2025, 26, "T1")` → `"AY2025/26 T1"`
 */
export function formatAcadTermLabel(
  acadYearStart: number,
  acadYearEnd: number,
  term: string,
): string {
  return `AY${acadYearStart}/${acadYearEnd} ${term}`;
}

/**
 * Convert a raw AcadTerm DB row into an AcadTermSummary.
 */
export function toAcadTermSummary(row: AcadTermRow): AcadTermSummary {
  return {
    id: row.id,
    label: formatAcadTermLabel(row.acadYearStart, row.acadYearEnd, row.term),
    startDt: row.startDt,
    endDt: row.endDt,
  };
}

/**
 * Resolve the "current" academic term from an in-memory list.
 *
 * Resolution order:
 * 1. Term whose [startDt, endDt] contains `now` (inclusive).
 * 2. Nearest upcoming term (startDt > now, earliest start).
 * 3. Latest past term (endDt < now, most recent end).
 * 4. `null` if the list is empty.
 */
export function resolveCurrentTerm(
  terms: AcadTermSummary[],
  now: Date,
): AcadTermSummary | null {
  if (terms.length === 0) return null;

  // Sort by startDt descending for consistent iteration
  const sorted = [...terms].sort(
    (a, b) => b.startDt.getTime() - a.startDt.getTime(),
  );

  // 1. Term containing now (inclusive bounds)
  const containing = sorted.find((t) => t.startDt <= now && t.endDt >= now);
  if (containing) return containing;

  // 2. Nearest upcoming term (startDt > now, closest start)
  const upcoming = sorted
    .filter((t) => t.startDt > now)
    .sort((a, b) => a.startDt.getTime() - b.startDt.getTime());
  if (upcoming[0]) return upcoming[0];

  // 3. Latest past term (endDt < now, most recent end)
  const past = sorted
    .filter((t) => t.endDt < now)
    .sort((a, b) => b.endDt.getTime() - a.endDt.getTime());
  if (past[0]) return past[0];

  return null;
}

// ============================================================
// Uncached DB fetch — exported for testing
// ============================================================

/**
 * Fetch all AcadTerm rows, map to summaries.
 * Sorted by `startDt` descending (most recent first).
 *
 * Exported as `_fetchAcadTerms` so tests can inject a mock delegate.
 */
export async function _fetchAcadTerms(prisma: {
  acadTerm: AcadTermDelegate;
}): Promise<AcadTermSummary[]> {
  const rows = await prisma.acadTerm.findMany({
    orderBy: { startDt: "desc" },
  });
  return rows.map(toAcadTermSummary);
}

// ============================================================
// Cached public API (Next.js unstable_cache)
// ============================================================

const CACHE_OPTIONS = { revalidate: 86400, tags: ["acad-terms"] };

/**
 * List all academic terms, newest first.
 * Cached for 24 hours; tagged `"acad-terms"` for manual revalidation.
 *
 * NOTE: `unstable_cache` derives its cache key from `JSON.stringify(args)`,
 * so the Prisma client (a circular structure) must never be passed as an
 * argument to the cached function. It is captured in a closure instead,
 * keeping every cached argument serializable.
 */
export async function listAcadTerms(prisma: {
  acadTerm: AcadTermDelegate;
}): Promise<AcadTermSummary[]> {
  // Outside the Next.js runtime (e.g. standalone `mcp-use dev/start`, which
  // shims `next/cache`), `unstable_cache` throws "incrementalCache missing".
  // Fall back to a direct DB fetch so MCP tools keep working there; the web
  // app path still gets the 24h cache.
  try {
    const cached = unstable_cache(
      () => _fetchAcadTerms(prisma),
      ["acad-terms", "list"],
      CACHE_OPTIONS,
    );
    const terms = await cached();
    // Cache hits come back JSON-deserialized: revive the Date objects so
    // consumers (e.g. resolveCurrentTerm) can rely on real Dates.
    return terms.map((t) => ({
      ...t,
      startDt: new Date(t.startDt),
      endDt: new Date(t.endDt),
    }));
  } catch {
    return _fetchAcadTerms(prisma);
  }
}

/**
 * Get the current academic term for `now` (defaults to `new Date()`).
 * Resolved in memory from the cached term list, so it needs no separate
 * cache entry (and no Prisma client in any cache key).
 */
export async function getCurrentAcadTerm(
  prisma: { acadTerm: AcadTermDelegate },
  now?: Date,
): Promise<AcadTermSummary | null> {
  const terms = await listAcadTerms(prisma);
  return resolveCurrentTerm(terms, now ?? new Date());
}
