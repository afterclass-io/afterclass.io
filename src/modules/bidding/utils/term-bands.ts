import type { AYGroup } from "./acad-term-groups";
import { parseBidWindowKey } from "./bid-window-key";

export type IndexedPoint<T extends { bidWindow: string }> = T & { idx: number };

export function withPlotIndex<T extends { bidWindow: string }>(
  sorted: T[],
): IndexedPoint<T>[] {
  return sorted.map((p, idx) => ({ ...p, idx }));
}

export function computeTermBandBounds<T extends { bidWindow: string }>(
  indexed: IndexedPoint<T>[],
  groups: AYGroup[],
): { acadTermId: string; x1: number; x2: number }[] {
  const idxOf = new Map(indexed.map((p) => [p.bidWindow, p.idx]));
  return groups
    .map((g) => {
      const first = idxOf.get(g.firstBidWindow);
      const last = idxOf.get(g.lastBidWindow);
      if (first === undefined || last === undefined) return null;
      void parseBidWindowKey(g.firstBidWindow);
      return { acadTermId: g.acadTermId, x1: first - 0.5, x2: last + 0.5 };
    })
    .filter((b): b is { acadTermId: string; x1: number; x2: number } => b !== null);
}

export function computeTermBoundaries<T extends { bidWindow: string }>(
  indexed: IndexedPoint<T>[],
): number[] {
  const edges: number[] = [];
  for (let i = 1; i < indexed.length; i++) {
    const [prev] = indexed[i - 1]!.bidWindow.split("/");
    const [cur] = indexed[i]!.bidWindow.split("/");
    if (prev !== cur) edges.push(indexed[i - 1]!.idx + 0.5);
  }
  return edges;
}

export function shouldShowNowMarker<T extends { bidWindow: string }>(
  indexed: IndexedPoint<T>[],
  currentAcadTermId: string | undefined,
): boolean {
  if (!currentAcadTermId) return false;
  return indexed.some(
    (p) => p.bidWindow.split("/")[0] === currentAcadTermId,
  );
}
