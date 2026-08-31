"use client";
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- roadmap grid uses ARIA grid roles on CSS-grid divs, not a <table> */

import type { Entry } from "../functions/conflicts";
import { RoadmapTermCell } from "./RoadmapTermCell";
import { cn } from "@/common/functions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapYearRowProps = {
  yearNumber: number;
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

const TERMS = ["T1", "T2", "T3A", "T3B"] as const;

/** Fixed-width year-label column shared by the grid header and rows. */
export const YEAR_LABEL_COL = "grid-cols-[2.5rem_repeat(4,minmax(0,1fr))]";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapYearRow({
  yearNumber,
  entries,
  sortableIds,
  readOnly = false,
  onCourseClick,
  onRemove,
  className,
}: RoadmapYearRowProps) {
  const entriesForYear = entries.filter((e) => e.yearNumber === yearNumber);

  return (
    <div
      className={cn("grid gap-2", YEAR_LABEL_COL, className)}
      role="row"
      aria-label={`Year ${yearNumber}`}
    >
      {/* Year label */}
      <div className="flex items-center justify-center">
        <span className="text-muted-foreground text-sm font-bold tabular-nums">Y{yearNumber}</span>
      </div>

      {/* Term cells */}
      {TERMS.map((term) => {
        const termEntries = entriesForYear.filter((e) => e.term === term);
        return (
          <RoadmapTermCell
            key={term}
            yearNumber={yearNumber}
            term={term}
            entries={termEntries}
            sortableIds={sortableIds}
            readOnly={readOnly}
            onCourseClick={onCourseClick}
            onRemove={onRemove}
          />
        );
      })}
    </div>
  );
}
