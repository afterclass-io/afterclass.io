// src/server/mcp/tools/bid-write-helpers.ts

/** Index listMine rows for O(1) term lookup (replaces per-entry full scans). */
export function buildTermMap(
  mine: Array<{
    classId: string;
    bidWindowId: number;
    bidWindow?: { acadTermId?: string | null } | null;
  }>,
): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of mine) {
    const term = b.bidWindow?.acadTermId;
    if (term) m.set(`${b.classId}|${b.bidWindowId}`, term);
  }
  return m;
}
