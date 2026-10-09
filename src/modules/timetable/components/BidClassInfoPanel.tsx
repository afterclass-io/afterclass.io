"use client";

import { BidDialog, type UserBidRow } from "./BidDialog";

/**
 * Opens the unified BidDialog in class mode for a bid row's class. The dialog
 * resolves the full course details (credit units, timings, professor) itself
 * from the term-scoped course search.
 */
export function BidClassInfoPanel({
  bid,
  onClose,
}: {
  bid: UserBidRow;
  onClose: () => void;
}) {
  return (
    <BidDialog
      mode="class"
      classId={bid.classId}
      courseCode={bid.courseCode}
      section={bid.section}
      acadTermId={bid.bidWindow.acadTermId}
      isOpen
      onClose={onClose}
    />
  );
}
