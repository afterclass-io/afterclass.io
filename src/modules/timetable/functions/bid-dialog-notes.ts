// Notes loading for the unified BidDialog.
//
// Notes are per (class, bid window): when the selection changes the dialog
// loads that window's saved notes from `userBids.getByClassIds` into the
// textarea (empty when no bid exists there). The loader must never run against
// a still-empty cache and wipe the textarea before the query settles — a
// review finding showed that in edit mode this silently deleted the user's
// saved notes. All the state transitions are encoded here as a pure function
// so they can be unit-tested without mounting the tRPC-bound dialog.

export type BidDialogNotesClassBid = {
  bidWindowId: number;
  notes?: string | null;
};

export type BidDialogNotesInput = {
  mode: "add" | "edit" | "class";
  /** the bid being edited — its notes are pre-filled into the textarea */
  bid?: { classId: string; bidWindowId: number; notes?: string | null } | null;
  /** currently selected class id (null until a section is picked) */
  selectedClassId?: string | null;
  /** selected bid window id in Select-value (string) form */
  selectedBidWindowId?: string | null;
  /** existing bids for the selected class, from getByClassIds */
  classBids: BidDialogNotesClassBid[];
  /** the (class, window) key whose notes were already applied */
  loadedNotesKey: string | null;
  /** whether the getByClassIds query has settled (fetched or succeeded) */
  classBidsSettled: boolean;
};

export type BidDialogNotesResult = {
  /** notes to write into the textarea; omit to keep the current value */
  notes?: string;
  /** key to latch as loaded; omit to keep the current latch */
  loadedNotesKey?: string;
};

export function notesKeyFor(classId: string, bidWindowId: string | number) {
  return `${classId}:${bidWindowId}`;
}

/**
 * Decide what to do with the notes textarea for the current (class, window).
 *
 * - Never applies notes before the `getByClassIds` query has settled — a
 *   still-empty cache must not wipe pre-filled notes (edit mode) or latch an
 *   empty value before the real fetch resolves (add/class mode).
 * - In edit mode, the textarea is pre-filled from `bid`; for the bid's own
 *   window that value is authoritative and is never replaced by the query's
 *   view (which could be empty if the fetch failed). The key is still latched
 *   so a later query settle/refetch won't re-run the loader.
 * - If the user switches away from the bid's own window (loading another
 *   window's notes) and then switches back, the bid's own notes are restored
 *   — otherwise the textarea would stay empty and the save would delete them.
 * - For any other window (or in add/class mode) the window's saved notes are
 *   applied, or cleared when no bid exists for that window.
 * - Once a (class, window) key has been loaded it is not applied again, so
 *   typing in the textarea is never clobbered by query refetches.
 */
export function resolveBidDialogNotes({
  mode,
  bid,
  selectedClassId,
  selectedBidWindowId,
  classBids,
  loadedNotesKey,
  classBidsSettled,
}: BidDialogNotesInput): BidDialogNotesResult {
  if (!classBidsSettled) return {};
  if (!selectedClassId || !selectedBidWindowId) return {};

  const key = notesKeyFor(selectedClassId, selectedBidWindowId);
  if (key === loadedNotesKey) return {};

  if (
    mode === "edit" &&
    bid &&
    key === notesKeyFor(bid.classId, bid.bidWindowId)
  ) {
    // Restore the bid's own notes only when the textarea currently holds a
    // different window's loaded content (`loadedNotesKey` is a non-null key
    // from elsewhere — e.g. the user switched away and back). On a cold
    // mount/settle `loadedNotesKey` is still null, the textarea already holds
    // the pre-filled `bid.notes`, and emitting would risk clobbering early
    // typing — that no-wipe behaviour is pinned by round-1's tests.
    const restoreOwnNotes = loadedNotesKey !== null && loadedNotesKey !== key;
    return {
      ...(restoreOwnNotes ? { notes: bid.notes ?? "" } : {}),
      loadedNotesKey: key,
    };
  }

  const match = classBids.find(
    (b) => b.bidWindowId === Number(selectedBidWindowId),
  );
  return { notes: match?.notes ?? "", loadedNotesKey: key };
}
