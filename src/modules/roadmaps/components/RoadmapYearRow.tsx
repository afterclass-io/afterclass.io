"use client";

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

/** Year label, T1, T2, merged T3 column. */
export const YEAR_ROW_COLS =
  "grid-cols-[2.5rem_minmax(0,2fr)_minmax(0,2fr)_minmax(5.5rem,1fr)]";

/** Header text and the stored terms each grid column holds. */
export const TERM_COLUMNS = [
  { header: "T1", terms: ["T1"] },
  { header: "T2", terms: ["T2"] },
  { header: "T3", terms: ["T3A", "T3B"] },
] as const;

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
      className={cn("grid gap-2", YEAR_ROW_COLS, className)}
      role="row"
      aria-label={`Year ${yearNumber}`}
    >
      {/* Year label */}
      <div className="flex items-center justify-center">
        <span className="text-muted-foreground text-sm font-bold tabular-nums">
          Y{yearNumber}
        </span>
      </div>

      {/* Term cells */}
      {TERM_COLUMNS.map((col) =>
        col.terms.length === 1 ? (
          <RoadmapTermCell
            key={col.header}
            yearNumber={yearNumber}
            term={col.terms[0]}
            entries={entriesForYear.filter((e) => e.term === col.terms[0])}
            sortableIds={sortableIds}
            readOnly={readOnly}
            onCourseClick={onCourseClick}
            onRemove={onRemove}
          />
        ) : (
          <div key={col.header} className="flex min-w-0 flex-col gap-2">
            {col.terms.map((term) => (
              <RoadmapTermCell
                key={term}
                yearNumber={yearNumber}
                term={term}
                compact
                className="flex-1"
                entries={entriesForYear.filter((e) => e.term === term)}
                sortableIds={sortableIds}
                readOnly={readOnly}
                onCourseClick={onCourseClick}
                onRemove={onRemove}
              />
            ))}
          </div>
        ),
      )}
    </div>
  );
}
