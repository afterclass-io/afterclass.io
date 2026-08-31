"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role, jsx-a11y/no-static-element-interactions -- dnd-kit draggable: role + Enter/Space handling implemented manually */

import { useSortable } from "@dnd-kit/sortable";
import { GripVertical, X } from "lucide-react";
import { courseColor } from "@/modules/timetable/functions/course-color";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapCourseChipProps = {
  courseId: string;
  courseCode: string;
  courseName: string;
  creditUnits: number;
  draggable?: boolean;
  /** Sortable ID for dnd-kit. Defaults to courseId if not provided. */
  sortableId?: string;
  /** Called when the chip is clicked (opens course details). */
  onClick?: () => void;
  /** Called when the chip's remove (×) affordance is clicked (edit mode only). */
  onRemove?: () => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Inner (non-draggable) chip
// ---------------------------------------------------------------------------

function CourseChipInner({
  courseCode,
  courseName,
  creditUnits,
  draggable,
  onClick,
  onRemove,
  className,
}: Omit<RoadmapCourseChipProps, "courseId">) {
  const { className: colorClasses } = courseColor(courseCode);

  return (
    <div
      className={cn(
        "relative flex flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium shadow-sm transition-colors select-none",
        "motion-safe:transition-transform motion-safe:duration-150",
        onClick && "cursor-pointer",
        onRemove && "pr-7",
        colorClasses,
        className,
      )}
    >
      {draggable && <GripVertical className="size-3.5 shrink-0 opacity-50" aria-hidden />}
      <span className="truncate font-semibold">{courseCode}</span>
      {creditUnits > 0 && (
        <span className="bg-background/60 ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold">
          {creditUnits} CU
        </span>
      )}
      {/* Course name on its own line — wide screens only */}
      <span className="hidden w-full text-[11px] leading-tight font-normal break-words opacity-80 lg:block">
        {courseName}
      </span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${courseCode} from roadmap`}
          className="hover:bg-background/80 absolute top-1 right-1 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable wrapper
// ---------------------------------------------------------------------------

export function RoadmapCourseChip(props: RoadmapCourseChipProps) {
  const { courseId, draggable = false, sortableId } = props;

  const dndId = sortableId ?? courseId;

  // Always call hooks unconditionally (rules of hooks)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: dndId,
    disabled: !draggable,
  });

  if (!draggable) {
    return (
      <div
        role={props.onClick ? "button" : undefined}
        tabIndex={props.onClick ? 0 : undefined}
        onClick={props.onClick}
        onKeyDown={(e) => {
          if (props.onClick && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            props.onClick();
          }
        }}
      >
        <CourseChipInner {...props} draggable={false} />
      </div>
    );
  }

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`Drag ${props.courseCode}: ${props.courseName}`}
      aria-roledescription="draggable course chip"
      onKeyDown={(e) => {
        if (e.key === " ") {
          e.preventDefault();
          // Space to pick up — handled by dnd-kit keyboard sensor
        }
        if (e.key === "Enter") {
          // Enter opens course details (drag uses a 5px pointer threshold,
          // so plain clicks never start a drag).
          props.onClick?.();
        }
        if (e.key === "Escape") {
          // Escape to cancel — dnd-kit handles this
        }
      }}
      onClick={props.onClick}
    >
      <CourseChipInner {...props} draggable />
    </div>
  );
}
