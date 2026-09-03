"use client";

import { useMemo } from "react";
import { Skeleton } from "@/common/components/skeleton";
import { cn } from "@/common/functions";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";
import {
  layoutTimeline,
  COURSE_GAP_Y,
  COURSE_START_Y,
} from "@/modules/roadmaps/functions/timeline-layout";

type RoadmapTimelineSkeletonProps = {
  entries: Entry[];
  className?: string;
};

/**
 * Loading placeholder for RoadmapTimeline (#515). Mirrors the timeline's
 * outer box exactly — h-[500px] base, minHeight up to 800, 300px empty state
 * — so the dynamic swap does not shift layout. Deliberately imports no
 * @xyflow/react: this ships with the initial chunk while the timeline loads
 * on demand.
 */
export function RoadmapTimelineSkeleton({
  entries,
  className,
}: RoadmapTimelineSkeletonProps) {
  const maxY = useMemo(() => {
    const layout = layoutTimeline(entries);
    if (layout.nodes.length === 0) return COURSE_START_Y + COURSE_GAP_Y;
    return (
      Math.max(...layout.nodes.map((n) => n.position.y)) + COURSE_GAP_Y + 40
    );
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "border-border bg-muted/30 flex min-h-[300px] items-center justify-center rounded-lg border border-dashed",
          className,
        )}
      >
        <p className="text-muted-foreground text-sm">
          No courses added yet. Add courses to see the timeline.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("relative h-[500px] w-full rounded-lg border", className)}
      style={{ minHeight: Math.min(maxY + 40, 800) }}
    >
      <Skeleton className="h-full w-full rounded-lg" />
    </div>
  );
}
