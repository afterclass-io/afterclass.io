"use client";

import { BidDialog } from "./BidDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  classId: string;
  courseCode: string;
  section: string;
  acadTermId: string;
  isOpen: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Thin wrapper keeping the timetable-context (slot click) entry point.
 *
 * The actual dialog implementation now lives in `BidDialog` (class mode):
 * class info, bid prediction and the "Your bid" form are all rendered there,
 * and the course/section details (credit units, timings, professor) are
 * resolved from the term-scoped course search — so callers only need the
 * class identity, not the pre-fetched slot details this panel used to take.
 */
export function SlotBidPanel({
  classId,
  courseCode,
  section,
  acadTermId,
  isOpen,
  onClose,
}: Props) {
  return (
    <BidDialog
      mode="class"
      classId={classId}
      courseCode={courseCode}
      section={section}
      acadTermId={acadTermId}
      isOpen={isOpen}
      onClose={onClose}
    />
  );
}
