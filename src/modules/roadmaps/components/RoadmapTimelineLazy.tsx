"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/common/components/skeleton";

/**
 * The roadmap timeline (xyflow) is a non-default toggle view, below the fold
 * on every route that renders it. One lazy wrapper so the dynamic config and
 * loading skeleton cannot drift between the three call sites; the grid
 * (default, above the fold) stays server-rendered.
 */
export const RoadmapTimelineLazy = dynamic(
  () =>
    import("@/modules/roadmaps/components/RoadmapTimeline").then(
      (m) => m.RoadmapTimeline,
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-lg" />,
  },
);
