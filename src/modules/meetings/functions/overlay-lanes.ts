export type LaneInput = { startSlot: number; length: number };
export type LanePlacement = { lane: number; laneCount: number };

/**
 * Side-by-side placement for blocks that overlap in time. Blocks that overlap
 * (directly or through a chain) share a cluster; each gets its own lane and the
 * cluster's lane count, so widths never overlap. Results follow input order.
 */
export function assignLanes(blocks: readonly LaneInput[]): LanePlacement[] {
  const order = blocks
    .map((block, index) => ({ block, index }))
    .sort(
      (a, b) =>
        a.block.startSlot - b.block.startSlot ||
        b.block.length - a.block.length,
    );

  const placements: LanePlacement[] = blocks.map(() => ({
    lane: 0,
    laneCount: 1,
  }));

  let cluster: number[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const closeCluster = () => {
    for (const index of cluster) placements[index]!.laneCount = laneEnds.length;
    cluster = [];
    laneEnds = [];
  };

  for (const { block, index } of order) {
    if (block.startSlot >= clusterEnd) closeCluster();

    let lane = laneEnds.findIndex((end) => end <= block.startSlot);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = block.startSlot + block.length;

    placements[index]!.lane = lane;
    cluster.push(index);
    clusterEnd = Math.max(clusterEnd, block.startSlot + block.length);
  }
  closeCluster();
  return placements;
}
