"use client";

import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";
import { PageTitle } from "@/common/components/page-title";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SharedTimetableViewProps = {
  timetableName: string;
  ownerUsername: string;
  slots: ArrangedClass[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharedTimetableView({
  timetableName,
  ownerUsername,
  slots,
}: SharedTimetableViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <PageTitle className="text-left text-2xl md:text-2xl! font-bold tracking-tight">
            Shared Timetable: {timetableName}
          </PageTitle>
          <p className="text-sm text-muted-foreground">
            by {ownerUsername}
          </p>
        </div>
      </div>

      {/* Grid */}
      <TimetableGrid
        classes={slots}
        view="classes"
        readOnly
      />
    </div>
  );
}
