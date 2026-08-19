// Adapted from SMU BidWise @ 7b3a2e1 (SemNode.tsx)
// Original MIT-licensed code: SMU-BidWise/frontend-website/src/components/roadmap/SemNode.tsx

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { courseColor } from "@/modules/timetable/functions/course-color";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TimelineNodeData = {
  courseCode: string;
  courseName: string;
  creditUnits: number;
  description?: string | null;
  yearNumber: number;
  term: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function RoadmapTimelineNodeInner({
  data,
}: NodeProps & { data: TimelineNodeData }) {
  const { courseCode, courseName, creditUnits } = data;
  const { className: colorClasses } = courseColor(courseCode);

  return (
    // The palette background is translucent (e.g. bg-primary/10), which lets
    // timeline connector lines show through the card. Layer it over an opaque
    // bg-card base so the composite background is solid while keeping the
    // course-color tint.
    <div className="bg-card max-w-[180px] min-w-[140px] rounded-lg shadow-sm transition-shadow hover:shadow-md">
      <div
        className={cn(
          "flex cursor-pointer flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2",
          "text-left",
          colorClasses,
        )}
      >
        {/* Top row: course code + CU badge */}
        <div className="flex w-full items-center justify-between gap-2">
          <span className="truncate text-sm leading-tight font-bold">
            {courseCode}
          </span>
          {creditUnits > 0 && (
            <span className="bg-background/60 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold">
              {creditUnits} CU
            </span>
          )}
        </div>

        {/* Course name */}
        <span className="line-clamp-2 text-[11px] leading-tight opacity-80">
          {courseName}
        </span>

        {/* ReactFlow handle — invisible; term node connects in from above */}
        <Handle
          type="target"
          position={Position.Top}
          id="t-target"
          style={{
            width: 0,
            height: 0,
            background: "transparent",
            border: "none",
          }}
        />
      </div>
    </div>
  );
}

export const RoadmapTimelineNode = memo(RoadmapTimelineNodeInner);
