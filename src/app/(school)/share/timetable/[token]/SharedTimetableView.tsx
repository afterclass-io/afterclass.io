"use client";

import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid";
import type { ArrangedClass } from "@/common/types/timetable";
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
          <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
            Shared Timetable: {timetableName}
          </PageTitle>
          <p className="text-muted-foreground text-sm">by {ownerUsername}</p>
        </div>
      </div>

      {/* Grid */}
      <TimetableGrid classes={slots} view="classes" readOnly />
    </div>
  );
}
