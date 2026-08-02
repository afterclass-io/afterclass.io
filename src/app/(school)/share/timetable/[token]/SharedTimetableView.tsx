"use client";

import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Shared Timetable: {timetableName}
        </h1>
        <p className="text-sm text-muted-foreground">
          by {ownerUsername}
        </p>
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
