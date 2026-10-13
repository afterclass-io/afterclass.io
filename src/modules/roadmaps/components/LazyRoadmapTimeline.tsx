"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/common/components/skeleton";

// @xyflow/react is heavy and only the timeline view needs it: load it on the client only.
export const LazyRoadmapTimeline = dynamic(
  () =>
    import("@/modules/roadmaps/components/RoadmapTimeline").then(
      (m) => m.RoadmapTimeline,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[500px] w-full" /> },
);
