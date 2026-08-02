// Adapted from SMU BidWise @ 7b3a2e1 (TimelineExplorer.tsx, SemNode.tsx)
// Original MIT-licensed code: SMU-BidWise/frontend-website/src/components/roadmap/

"use client";

import { useMemo, useState, memo } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Edge,
  type Node,
  type NodeProps,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  RoadmapTimelineNode,
  type TimelineNodeData,
} from "./RoadmapTimelineNode";
import {
  RoadmapCourseDialog,
  type RoadmapCourseInfo,
} from "./RoadmapCourseDialog";
import { cn } from "@/common/functions";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";
import {
  layoutTimeline,
  COURSE_GAP_Y,
  COURSE_START_Y,
} from "@/modules/roadmaps/functions/timeline-layout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapTimelineProps = {
  entries: Entry[];
  readOnly?: boolean;
  className?: string;
};

type TermNodeData = { label: string };
type TimelineNode = Node<TimelineNodeData> | Node<TermNodeData>;

// ---------------------------------------------------------------------------
// Term (spine) node — visually distinct from course cards: a muted pill
// ---------------------------------------------------------------------------

const TimelineTermNode = memo(function TimelineTermNode({
  data,
}: NodeProps & { data: TermNodeData }) {
  return (
    <div className="border-border bg-muted text-muted-foreground w-[160px] rounded-full border px-4 py-1.5 text-center text-xs font-semibold tracking-wider uppercase select-none">
      {data.label}

      {/* Spine in/out (left/right) + course fan-out (bottom) */}
      <Handle
        type="target"
        position={Position.Left}
        id="l-target"
        style={INVISIBLE_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="r-src"
        style={INVISIBLE_HANDLE_STYLE}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b-src"
        style={INVISIBLE_HANDLE_STYLE}
      />
    </div>
  );
});

const INVISIBLE_HANDLE_STYLE = {
  width: 0,
  height: 0,
  background: "transparent",
  border: "none",
} as const;

const nodeTypes = {
  timelineCourse: RoadmapTimelineNode,
  timelineTerm: TimelineTermNode,
};

// ---------------------------------------------------------------------------
// ReactFlow mapping
// ---------------------------------------------------------------------------

const EDGE_STYLE = {
  stroke: "var(--muted-foreground)",
  strokeOpacity: 0.45,
  strokeWidth: 1.5,
} as const;

/** Map the pure layout onto ReactFlow nodes/edges. */
function toFlowElements(entries: Entry[]): {
  nodes: TimelineNode[];
  edges: Edge[];
} {
  const layout = layoutTimeline(entries);

  const nodes: TimelineNode[] = layout.nodes.map((n) => {
    if (n.kind === "term") {
      return {
        id: n.id,
        type: "timelineTerm",
        position: n.position,
        data: { label: n.label ?? "" },
        draggable: false,
        selectable: false,
        connectable: false,
      };
    }
    const entry = n.entry!;
    return {
      id: n.id,
      type: "timelineCourse",
      position: n.position,
      data: {
        courseCode: entry.courseCode,
        courseName: entry.courseName,
        creditUnits: entry.creditUnits,
        description: entry.description,
        yearNumber: entry.yearNumber,
        term: entry.term,
      },
    };
  });

  const edges: Edge[] = layout.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.kind === "spine" ? "r-src" : "b-src",
    targetHandle: e.kind === "spine" ? "l-target" : "t-target",
    style: EDGE_STYLE,
    selectable: false,
  }));

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapTimeline({
  entries,
  readOnly = false,
  className,
}: RoadmapTimelineProps) {
  const { resolvedTheme } = useTheme();
  const [selectedCourse, setSelectedCourse] =
    useState<RoadmapCourseInfo | null>(null);

  const { nodes: initialNodes, edges } = useMemo(
    () => toFlowElements(entries),
    [entries],
  );

  const [_nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);

  // Compute max Y for dynamic height
  const maxY = useMemo(() => {
    if (initialNodes.length === 0) return COURSE_START_Y + COURSE_GAP_Y;
    return (
      Math.max(...initialNodes.map((n) => n.position.y)) + COURSE_GAP_Y + 40
    );
  }, [initialNodes]);

  // Empty state
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
      <ReactFlow
        key={`${entries.length}-${entries[0]?.courseId ?? "empty"}`}
        nodes={initialNodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onNodeClick={(_event, node) => {
          if (node.type !== "timelineCourse") return;
          const data = node.data as TimelineNodeData;
          setSelectedCourse({
            courseCode: data.courseCode,
            courseName: data.courseName,
            creditUnits: data.creditUnits,
            description: data.description,
          });
        }}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable={!readOnly}
        proOptions={{ hideAttribution: true }}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        className="bg-background"
      >
        <Background gap={20} size={1} color="var(--border)" />
        <Controls
          showInteractive={!readOnly}
          className="rounded-lg border shadow-sm"
        />
      </ReactFlow>

      <RoadmapCourseDialog
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
