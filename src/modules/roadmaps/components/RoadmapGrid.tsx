"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Entry, Conflict } from "../functions/conflicts";
import { detectConflicts, findEntryByCourse } from "../functions/conflicts";
import { RoadmapYearRow, YEAR_LABEL_COL } from "./RoadmapYearRow";
import { RoadmapConflictBadge } from "./RoadmapConflictBadge";
import {
  RoadmapCourseDialog,
  type RoadmapCourseInfo,
} from "./RoadmapCourseDialog";
import { Button } from "@/common/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapGridProps = {
  roadmapId: string;
  entries: Entry[];
  readOnly?: boolean;
  onEntriesChange: (entries: Entry[]) => void;
  onSave?: (entries: Entry[]) => void;
  /** Optional sidebar rendered inside the DndContext (e.g. course search). */
  sidebar?: React.ReactNode;
  /** Optional footer renderer below each term cell (e.g. timetable links). */
  termFooter?: (yearNumber: number, term: string) => React.ReactNode;
  className?: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERMS = ["T1", "T2", "T3A", "T3B"] as const;
/** SMU's maximum candidature for standard degrees is 5 academic years. */
const MAX_YEARS = 5;
const DEBOUNCE_MS = 800;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a stable sortable ID for an entry.
 * Uses the entry's position in the array combined with a hash to remain
 * stable across moves (dnd-kit needs stable IDs).
 */
function entrySortableId(entry: Entry, index: number): string {
  return `entry-${index}-${entry.courseId}`;
}

/** Categorize conflicts by term for inline badge display. */
function groupConflictsByTerm(conflicts: Conflict[]): Map<string, Conflict[]> {
  const map = new Map<string, Conflict[]>();
  for (const c of conflicts) {
    const key = `${c.term.yearNumber}-${c.term.term}`;
    const existing = map.get(key);
    if (existing) {
      existing.push(c);
    } else {
      map.set(key, [c]);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapGrid({
  roadmapId,
  entries,
  readOnly = false,
  onEntriesChange,
  onSave,
  sidebar,
  termFooter,
  className,
}: RoadmapGridProps) {
  // ---- Local state ----
  const [localEntries, setLocalEntries] = useState<Entry[]>(entries);
  const [dirty, setDirty] = useState(false);
  /** Years manually appended beyond the highest year used by entries. */
  const [addedYears, setAddedYears] = useState(0);
  const [selectedCourse, setSelectedCourse] =
    useState<RoadmapCourseInfo | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external entries when they change (e.g. after server save)
  useEffect(() => {
    if (!dirty) {
      setLocalEntries(entries);
    }
  }, [entries, dirty]);

  // Reset manually added years when switching to another roadmap
  useEffect(() => {
    setAddedYears(0);
  }, [roadmapId]);

  // ---- Debounced save ----
  useEffect(() => {
    if (!dirty || !onSave) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSave(localEntries);
      setDirty(false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [localEntries, dirty, onSave]);

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (dirty && onSave) {
        onSave(localEntries);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Sensors ----
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ---- Derived ----
  const maxYearNumber = useMemo(() => {
    const highestEntryYear =
      localEntries.length === 0
        ? 1
        : Math.max(...localEntries.map((e) => e.yearNumber), 1);
    return Math.min(highestEntryYear + addedYears, MAX_YEARS);
  }, [localEntries, addedYears]);

  const yearNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let y = 1; y <= maxYearNumber; y++) {
      nums.push(y);
    }
    return nums;
  }, [maxYearNumber]);

  // Detect conflicts
  const conflicts = useMemo(
    () => detectConflicts(localEntries),
    [localEntries],
  );

  const conflictsByTerm = useMemo(
    () => groupConflictsByTerm(conflicts),
    [conflicts],
  );

  // Build a lookup from sortableId → entry index
  const entryIndexById = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < localEntries.length; i++) {
      const entry = localEntries[i]!;
      map.set(entrySortableId(entry, i), i);
    }
    return map;
  }, [localEntries]);

  // ---- Handlers ----
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    /* drag start — no-op */
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeIdStr = String(active.id);
      const overIdStr = String(over.id);

      // Determine if this is a sidebar drag (new course) or grid drag (move)
      const isSidebarDrag = active.data.current?.type === "sidebar-course";

      if (isSidebarDrag) {
        // Adding a new course from sidebar to grid
        const course = active.data.current?.course as
          | { id: string; code: string; name: string; creditUnits: number }
          | undefined;
        if (!course) return;

        // A course may only be planned once — block adds that would place a
        // course already in the roadmap into another term (or the same term
        // twice), which would otherwise duplicate chips and break list keys.
        if (findEntryByCourse(localEntries, course.id)) {
          toast.error(`${course.code} is already in your roadmap`);
          return;
        }

        // Parse the droppable target
        const targetData = over.data.current as
          | { yearNumber: number; term: string; type: string }
          | undefined;

        let yearNumber: number;
        let term: string;

        if (targetData?.type === "term-cell") {
          yearNumber = targetData.yearNumber;
          term = targetData.term;
        } else {
          // Dropped on a sortable item — find its cell
          const entryIdx = entryIndexById.get(overIdStr);
          if (entryIdx === undefined) return;
          const targetEntry = localEntries[entryIdx]!;
          yearNumber = targetEntry.yearNumber;
          term = targetEntry.term;
        }

        const newEntry: Entry = {
          courseId: course.id,
          courseCode: course.code,
          courseName: course.name,
          creditUnits: course.creditUnits,
          yearNumber,
          term,
        };

        const updated = [...localEntries, newEntry];
        setLocalEntries(updated);
        setDirty(true);
        onEntriesChange(updated);
        return;
      }

      // Grid drag: move an existing entry
      const entryIdx = entryIndexById.get(activeIdStr);
      if (entryIdx === undefined) return;

      const targetData = over.data.current as
        | { yearNumber: number; term: string; type: string }
        | undefined;

      let yearNumber: number;
      let term: string;

      if (targetData?.type === "term-cell") {
        yearNumber = targetData.yearNumber;
        term = targetData.term;
      } else {
        // Dropped on another sortable item
        const targetIdx = entryIndexById.get(overIdStr);
        if (targetIdx === undefined) return;
        const targetEntry = localEntries[targetIdx]!;
        yearNumber = targetEntry.yearNumber;
        term = targetEntry.term;
      }

      const updated = localEntries.map((e, i) => {
        if (i === entryIdx) {
          return { ...e, yearNumber, term };
        }
        return e;
      });

      setLocalEntries(updated);
      setDirty(true);
      onEntriesChange(updated);
    },
    [localEntries, entryIndexById, onEntriesChange],
  );

  const handleAddYear = useCallback(() => {
    // Adding a year only expands the grid — entries are created when courses
    // are dropped into the new year's term cells. The button is disabled once
    // MAX_YEARS is reached, and maxYearNumber is capped as a guard.
    setAddedYears((prev) => prev + 1);
  }, []);

  const handleCourseClick = useCallback((entry: Entry) => {
    setSelectedCourse({
      courseCode: entry.courseCode,
      courseName: entry.courseName,
      creditUnits: entry.creditUnits,
      description: entry.description,
    });
  }, []);

  const handleRemoveEntry = useCallback(
    (entry: Entry) => {
      const updated = localEntries.filter(
        (e) =>
          !(
            e.courseId === entry.courseId &&
            e.yearNumber === entry.yearNumber &&
            e.term === entry.term
          ),
      );
      setLocalEntries(updated);
      setDirty(true);
      onEntriesChange(updated);
    },
    [localEntries, onEntriesChange],
  );

  /** Map from entryKey → sortableId for all entries. */
  const sortableIdMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < localEntries.length; i++) {
      const entry = localEntries[i]!;
      const key = `${entry.courseId}::${entry.yearNumber}::${entry.term}`;
      map.set(key, entrySortableId(entry, i));
    }
    return map;
  }, [localEntries]);

  // ---- Render ----
  return (
    <div className={cn("space-y-4 h-full", className)}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* relative: anchors the absolutely-positioned search sidebar so it
            spans the grid column's full height (a tall search list used to
            stretch the row to the viewport). h-full: the column fills the
            main area, so the separator meets the editor's bottom border. */}
        <div className="relative flex h-full flex-col gap-4 lg:flex-row">
          {/* Main grid area (scrolls horizontally on small screens). The
              right padding reserves space for the absolute sidebar + handle. */}
          <div className="min-w-0 flex-1 overflow-x-auto lg:pr-[calc(var(--roadmap-sidebar-width)_+_4px)]">
            <div className="min-w-[540px]">
              {/* Grid header */}
              <div className={cn("grid gap-2", YEAR_LABEL_COL)}>
                <div />
                {TERMS.map((term) => (
                  <div key={term} className="text-center">
                    <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                      {term}
                    </span>
                  </div>
                ))}
              </div>

              {/* Year rows */}
              <div className="space-y-3">
                {yearNumbers.map((yearNumber) => {
                  const cellSortableIds: string[] = [];

                  // Gather sortable IDs for all entries in this year
                  for (let i = 0; i < localEntries.length; i++) {
                    const e = localEntries[i]!;
                    if (e.yearNumber === yearNumber) {
                      cellSortableIds.push(entrySortableId(e, i));
                    }
                  }

                  return (
                    <SortableContext key={yearNumber} items={cellSortableIds}>
                      <RoadmapYearRow
                        yearNumber={yearNumber}
                        entries={localEntries}
                        sortableIds={sortableIdMap}
                        readOnly={readOnly}
                        onCourseClick={handleCourseClick}
                        onRemove={readOnly ? undefined : handleRemoveEntry}
                      />

                      {/* Conflict badges per term */}
                      <div className={cn("grid gap-2 px-1", YEAR_LABEL_COL)}>
                        <div />
                        {TERMS.map((term) => {
                          const key = `${yearNumber}-${term}`;
                          const termConflicts = conflictsByTerm.get(key) ?? [];
                          return (
                            <div key={term}>
                              <RoadmapConflictBadge conflicts={termConflicts} />
                            </div>
                          );
                        })}
                      </div>

                      {/* Term footer (e.g. timetable links) */}
                      {termFooter && (
                        <div className={cn("grid gap-2 px-1", YEAR_LABEL_COL)}>
                          <div />
                          {TERMS.map((term) => (
                            <div key={term}>{termFooter(yearNumber, term)}</div>
                          ))}
                        </div>
                      )}
                    </SortableContext>
                  );
                })}
              </div>

              {/* Add year button — disabled (with reason) at the 5-year
                  maximum candidature cap */}
              {!readOnly &&
                (maxYearNumber < MAX_YEARS ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddYear}
                    className="mt-2 w-full"
                  >
                    <Plus className="size-4" />
                    Add Year
                  </Button>
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {/* Disabled buttons don't fire pointer events, so the
                          tooltip anchors to this wrapper instead. */}
                      <span className="mt-2 block w-full" tabIndex={0}>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full"
                        >
                          <Plus className="size-4" />
                          Add Year
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Maximum candidature is 5 years
                    </TooltipContent>
                  </Tooltip>
                ))}
            </div>
          </div>

          {/* Sidebar (e.g. course search) — stretches to full height so the
              resize handle separator between grid and courses panel fills
              the entire column. */}
          {sidebar}
        </div>
      </DndContext>

      <RoadmapCourseDialog
        course={selectedCourse}
        onClose={() => setSelectedCourse(null)}
      />
    </div>
  );
}
