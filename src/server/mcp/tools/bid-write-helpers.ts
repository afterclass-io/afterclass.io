// src/server/mcp/tools/bid-write-helpers.ts
import type { RouterCaller } from "../types";
import { resolveClassIdByCodeSection } from "../current";

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

/** Resolve one entry's classId (thin wrapper; single batched-query site). */
export async function resolveEntryClass(
  caller: RouterCaller,
  args: { courseCode: string; section: string; termId?: string },
): Promise<string | null> {
  return resolveClassIdByCodeSection(caller, args);
}
