"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Entry } from "../functions/conflicts";
import { RoadmapCourseChip } from "./RoadmapCourseChip";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapTermCellProps = {
  yearNumber: number;
  term: string;
  entries: Entry[];
  /** Map from entryKey to stable sortable ID for dnd-kit. */
  sortableIds?: Map<string, string>;
  readOnly?: boolean;
  /** Called when a course chip is clicked (opens course details). */
  onCourseClick?: (entry: Entry) => void;
  /** Called when a chip's remove (×) affordance is clicked (edit mode only). */
  onRemove?: (entry: Entry) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERM_LABELS: Record<string, string> = {
  T1: "Term 1",
  T2: "Term 2",
  T3A: "Term 3A",
  T3B: "Term 3B",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapTermCell({
  yearNumber,
  term,
  entries,
  sortableIds,
  readOnly = false,
  onCourseClick,
  onRemove,
  className,
}: RoadmapTermCellProps) {
  const droppableId = `${yearNumber}-${term}`;

  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { yearNumber, term, type: "term-cell" },
    disabled: readOnly,
  });

  /** Build a key for looking up the stable sortable ID. */
  function entryKey(e: Entry): string {
    return `${e.courseId}::${e.yearNumber}::${e.term}`;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[120px] flex-col gap-1 rounded-lg border-2 border-dashed p-2 transition-colors",
        isOver && !readOnly
          ? "border-primary/50 bg-primary/5"
          : "border-muted-foreground/20",
        readOnly && "cursor-default",
        "motion-safe:transition-all motion-safe:duration-150",
        className,
      )}
      data-droppable-id={droppableId}
      aria-label={`Year ${yearNumber} ${TERM_LABELS[term] ?? term}`}
    >
      {/* Term header */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {term}
        </span>
        {entries.length > 0 && (
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {entries.length} course{entries.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Entry chips */}
      <div className="flex flex-col gap-1">
        {entries.map((entry) => (
          <RoadmapCourseChip
            key={entry.courseId}
            courseId={entry.courseId}
            courseCode={entry.courseCode}
            courseName={entry.courseName}
            creditUnits={entry.creditUnits}
            draggable={!readOnly}
            sortableId={sortableIds?.get(entryKey(entry))}
            onClick={onCourseClick ? () => onCourseClick(entry) : undefined}
            onRemove={onRemove && !readOnly ? () => onRemove(entry) : undefined}
          />
        ))}
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <span className="text-muted-foreground/50 text-xs italic">
            {isOver ? "Drop here" : "Drag courses here"}
          </span>
        </div>
      )}
    </div>
  );
}
