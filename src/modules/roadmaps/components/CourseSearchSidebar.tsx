"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- dnd-kit draggable: keyboard handling implemented manually, cannot be a native <button> with drag listeners */

import { useMemo, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Search, GripVertical } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { Input } from "@/common/components/input";
import { Skeleton } from "@/common/components/skeleton";
import { courseColor } from "@/modules/timetable/functions/course-color";
import { cn } from "@/common/functions";
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SearchCourseResult = {
  id: string;
  code: string;
  name: string;
  creditUnits: number;
};

export type CourseSearchSidebarProps = {
  onAddCourse?: (course: SearchCourseResult) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Draggable search result chip
// ---------------------------------------------------------------------------

function DraggableSearchChip({
  course,
  onAddCourse,
}: {
  course: SearchCourseResult;
  onAddCourse?: (course: SearchCourseResult) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${course.id}`,
    data: {
      type: "sidebar-course",
      course,
    },
  });

  const { className: colorClasses } = courseColor(course.code);

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={() => onAddCourse?.(course)}
      className={cn(
        "flex cursor-grab items-start gap-1.5 rounded-md border px-2 py-1.5 text-sm font-medium shadow-sm transition-colors select-none active:cursor-grabbing",
        "motion-safe:transition-transform motion-safe:duration-150",
        colorClasses,
      )}
      style={style}
      role="button"
      tabIndex={0}
      aria-label={`Drag or click to add ${course.code}: ${course.name} to roadmap`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAddCourse?.(course);
        }
      }}
    >
      <GripVertical className="mt-0.5 size-3.5 shrink-0 opacity-50" aria-hidden />
      {/* Full code + name wrap to new lines (no ellipsis truncation) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-1.5">
          <span className="font-semibold break-words">{course.code}</span>
          {course.creditUnits > 0 && (
            <span className="bg-background/60 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold">
              {course.creditUnits} CU
            </span>
          )}
        </div>
        <span className="block text-xs break-words opacity-75">{course.name}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CourseSearchSidebar({ onAddCourse, className }: CourseSearchSidebarProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  // Search courses via tRPC
  const searchQuery = api.roadmaps.searchCourses.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 1,
      staleTime: 30_000,
    },
  );

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);

  const isLoading = searchQuery.isFetching && debouncedQuery.length >= 1;

  // Droppable "cancel" zone — dropping a sidebar-originated drag back here
  // is a no-op (cancels the add). This gives the search panel affordance
  // as a drop target without deleting grid items dragged from the panel.
  const { setNodeRef: setCancelRef, isOver: isOverCancel } = useDroppable({
    id: "sidebar-cancel-zone",
    data: { type: "sidebar-cancel" },
  });

  return (
    <aside
      ref={setCancelRef}
      data-droppable-id="sidebar-cancel-zone"
      className={cn(
        "bg-background flex h-full min-h-0 flex-col transition-colors",
        isOverCancel && "bg-muted/40",
        className,
      )}
    >
      {/* Header */}
      <div className="w-full border-b px-3 py-2">
        <h3 className="text-sm font-semibold">Courses</h3>
        <p className="text-muted-foreground text-xs">Drag courses into the roadmap grid</p>
      </div>

      {/* Search input */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search courses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
            aria-label="Search courses to add to roadmap"
          />
        </div>
      </div>

      {/* Results (scrolls internally — never scrolls the whole page) */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-gutter:stable]">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        )}

        {!isLoading && debouncedQuery.length >= 1 && results.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No courses found for &quot;{debouncedQuery}&quot;
          </p>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((course) => (
              <DraggableSearchChip key={course.id} course={course} onAddCourse={onAddCourse} />
            ))}
          </div>
        )}

        {debouncedQuery.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Search for a course to get started
          </p>
        )}
      </div>
    </aside>
  );
}
