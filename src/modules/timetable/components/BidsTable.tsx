"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { api } from "@/common/tools/trpc/react";
import { Skeleton } from "@/common/components/skeleton";
import {
  selectedTermIdAtom,
  activeTimetableIdAtom,
} from "@/modules/timetable/atoms/timetable";
import { pickCurrentBidWindow } from "@/modules/timetable/functions/current-window";
import { useBidsTableMutations } from "@/modules/timetable/hooks/use-bids-table-mutations";
import { BidsDashboard } from "./BidsDashboard";
import { BidDialog, type UserBidRow } from "./BidDialog";
import { BidClassInfoPanel } from "./BidClassInfoPanel";
import { Th, SortableTh } from "@/common/components/table-primitives";
import { BidTableRow } from "./BidTableRow";
import { BidsTableToolbar } from "./BidsTableToolbar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SortKey = "bidAmount" | "createdAt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * The bids section below the timetable calendar: a session dashboard plus a
 * sortable/filterable table of every bid the user has saved.
 *
 * - Filters: term / round / window. Term defaults to the current bid term;
 *   round and window default to "All rounds" / "All windows".
 * - Sorting: by bid amount (default: most recently saved first).
 * - Notes: inline-editable, auto-saved on blur.
 * - Course code/name/section (and professor, when assigned) open the
 *   class-info modal (BidDialog, class mode) for that class.
 * - Actions: Edit/Delete plus a status menu (planned/secured/dropped/
 *   cancelled).
 * - "Add bid" opens the same bid dialog used for editing, with empty
 *   defaults, to plan a bid without going through the calendar slot panel.
 */
export function BidsTable() {
  const selectedTermId = useAtomValue(selectedTermIdAtom);
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);

  // ---- Filter state (term follows the page's TermPicker; round/window
  // default to showing everything) ----
  const [termFilter, setTermFilter] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [windowFilter, setWindowFilter] = useState<string>("all");

  const effectiveTermId = termFilter ?? selectedTermId ?? null;

  // ---- Queries ----
  // The assistant and MCP agents can change bids from another tab.
  const bidsQuery = api.userBids.listMine.useQuery(undefined, {
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
  const termsQuery = api.acadTerms.list.useQuery();
  const windowsQuery = api.bidWindows.getByAcadTerm.useQuery(
    { acadTermId: effectiveTermId ?? "" },
    { enabled: !!effectiveTermId, staleTime: 60_000 },
  );

  const windows = useMemo(() => windowsQuery.data ?? [], [windowsQuery.data]);

  const currentWindow = useMemo(() => pickCurrentBidWindow(windows), [windows]);

  // ---- Sort state ----
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ---- Add-bid dialog (same dialog as editing, with empty defaults) ----
  const [showAddDialog, setShowAddDialog] = useState(false);

  // ---- Class-info modal (BidDialog, class mode) from a row's class cells ----
  const [classInfoBid, setClassInfoBid] = useState<UserBidRow | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  // ---- Mutations ----
  const {
    updateNotesMutation,
    removeMutation,
    setStatusMutation,
    addSlotMutation,
    addToTimetable,
    isBusy,
  } = useBidsTableMutations({
    bids: bidsQuery.data,
    activeTimetableId,
    effectiveTermId,
  });

  // ---- Full-edit dialog state ----
  const [editingBid, setEditingBid] = useState<UserBidRow | null>(null);

  // ---- Derived rows ----
  const roundOptions = useMemo(
    () => [...new Set(windows.map((w) => w.round))],
    [windows],
  );
  const windowOptions = useMemo(
    () => [...new Set(windows.map((w) => w.window))].sort((a, b) => a - b),
    [windows],
  );

  const filteredBids = useMemo(() => {
    const rows = (bidsQuery.data ?? []).filter((bid) => {
      if (effectiveTermId && bid.bidWindow.acadTermId !== effectiveTermId)
        return false;
      if (roundFilter !== "all" && bid.bidWindow.round !== roundFilter)
        return false;
      if (
        windowFilter !== "all" &&
        bid.bidWindow.window !== Number(windowFilter)
      )
        return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "bidAmount") return (a.bidAmount - b.bidAmount) * dir;
      const at = new Date(a.createdAt).getTime();
      const bt = new Date(b.createdAt).getTime();
      return (at - bt) * dir;
    });
  }, [
    bidsQuery.data,
    effectiveTermId,
    roundFilter,
    windowFilter,
    sortKey,
    sortDir,
  ]);

  // Bids in the filtered term feed the dashboard summary.
  const termBids = useMemo(
    () =>
      (bidsQuery.data ?? [])
        .filter(
          (bid) =>
            !effectiveTermId || bid.bidWindow.acadTermId === effectiveTermId,
        )
        .map((bid) => ({
          bidAmount: bid.bidAmount,
          status: bid.status,
        })),
    [bidsQuery.data, effectiveTermId],
  );

  // Denser header to match the bid analytics table: overrides the default
  // `h-10` with `h-auto py-2` (tailwind-merge drops the taller height).
  const denseThClass = "h-auto py-2 normal-case tracking-normal";

  // ---- Render ----
  if (bidsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  // Term context for the shared bid dialog: the bid's own term when editing,
  // the filtered term when adding.
  const bidDialogAcadTermId =
    editingBid?.bidWindow.acadTermId ??
    (showAddDialog ? effectiveTermId : null);

  return (
    <div className="flex flex-col gap-4" data-test="bids-view">
      {effectiveTermId && (
        <BidsDashboard acadTermId={effectiveTermId} bids={termBids} />
      )}

      <BidsTableToolbar
        terms={termsQuery.data ?? []}
        termId={effectiveTermId}
        onTermChange={setTermFilter}
        roundFilter={roundFilter}
        onRoundChange={setRoundFilter}
        roundOptions={roundOptions}
        windowFilter={windowFilter}
        onWindowChange={setWindowFilter}
        windowOptions={windowOptions}
        onAddBid={() => setShowAddDialog(true)}
        addDisabled={!effectiveTermId}
      />

      {/* Table (horizontal scroll on small screens). `contain:inline-size`
          keeps the table's min-content width from leaking up through flex
          ancestors and forcing page-level horizontal overflow when the
          sidebar is docked (≥xl); the wrapper still scrolls internally. */}
      <div className="border-border bg-card overflow-x-auto rounded-lg border [contain:inline-size]">
        <table className="w-full min-w-[540px] text-sm [&_td]:px-2 [&_th]:px-2">
          <thead>
            <tr className="border-b">
              <Th className={denseThClass}>Round/Window</Th>
              <Th className={denseThClass}>Course Code</Th>
              <Th className={denseThClass}>Course Name</Th>
              <Th className={denseThClass}>Section</Th>
              <Th className={denseThClass}>Professor</Th>
              <SortableTh
                label="My Bid"
                active={sortKey === "bidAmount"}
                dir={sortDir}
                onClick={() => toggleSort("bidAmount")}
                className={`${denseThClass} text-right`}
              />
              <Th className={denseThClass}>Notes</Th>
              <Th className={denseThClass}>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredBids.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="text-muted-foreground p-6 text-center"
                >
                  No bids match the current filters.
                </td>
              </tr>
            )}
            {filteredBids.map((bid) => (
              <BidTableRow
                key={bid.id}
                bid={bid}
                isBusy={isBusy}
                pendingAddClassId={
                  addSlotMutation.isPending
                    ? ((
                        addSlotMutation.variables as
                          { classId: string } | undefined
                      )?.classId ?? null)
                    : null
                }
                hasActiveTimetable={!!activeTimetableId}
                onSaveNotes={async (notes) =>
                  updateNotesMutation.mutate({
                    id: bid.id,
                    notes: notes ?? null,
                  })
                }
                onShowClassInfo={() => setClassInfoBid(bid)}
                onEdit={() => setEditingBid(bid)}
                onAddToTimetable={() => addToTimetable(bid.classId)}
                onSetStatus={(status) =>
                  setStatusMutation.mutate({ id: bid.id, status })
                }
                onDelete={() => removeMutation.mutate({ id: bid.id })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Unified bid dialog — add (empty defaults) and edit */}
      {bidDialogAcadTermId && (
        <BidDialog
          key={editingBid?.id ?? "add"}
          mode={editingBid ? "edit" : "add"}
          bid={editingBid}
          acadTermId={bidDialogAcadTermId}
          defaultWindowId={currentWindow?.id}
          isOpen
          onClose={() => {
            setEditingBid(null);
            setShowAddDialog(false);
          }}
        />
      )}

      {/* Class-info modal (same dialog the calendar opens on slot click) */}
      {classInfoBid && (
        <BidClassInfoPanel
          bid={classInfoBid}
          onClose={() => setClassInfoBid(null)}
        />
      )}
    </div>
  );
}
