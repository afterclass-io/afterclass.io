"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { CalendarPlus, ChevronDown, Loader2, Plus, Trash2 } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { cn } from "@/common/functions";
import { Button } from "@/common/components/button";
import { Skeleton } from "@/common/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/common/components/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import {
  selectedTermIdAtom,
  activeTimetableIdAtom,
} from "@/modules/timetable/atoms/timetable";
import { pickCurrentBidWindow } from "@/modules/timetable/functions/current-window";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import {
  BID_STATUS_LABELS,
  BID_STATUS_OPTIONS,
  bidChipVariant,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";
import { BidsDashboard } from "./BidsDashboard";
import { InlineNotesEditor } from "./InlineNotesEditor";
import { BidDialog } from "./BidDialog";
import { Th, SortableTh, Td } from "@/common/components/table-primitives";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BidRow = RouterOutputs["userBids"]["listMine"][number];

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
  const utils = api.useUtils();
  const selectedTermId = useAtomValue(selectedTermIdAtom);
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);

  // ---- Filter state (term follows the page's TermPicker; round/window
  // default to showing everything) ----
  const [termFilter, setTermFilter] = useState<string | null>(null);
  const [roundFilter, setRoundFilter] = useState<string>("all");
  const [windowFilter, setWindowFilter] = useState<string>("all");

  const effectiveTermId = termFilter ?? selectedTermId ?? null;

  // ---- Queries ----
  const bidsQuery = api.userBids.listMine.useQuery(undefined, {
    staleTime: 15_000,
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
  const [classInfoBid, setClassInfoBid] = useState<BidRow | null>(null);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  // ---- Mutations ----
  const invalidateBids = () => {
    void utils.userBids.listMine.invalidate();
    void utils.userBids.getByClassIds.invalidate();
  };

  // Note: add/edit saves run inside the unified BidDialog (upsert/update
  // with its own optimistic callbacks + invalidation), so only the row-level
  // notes/status/remove mutations live here.
  const updateNotesMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      invalidateBids();
    },
    onError: (error) => toast.error(`Failed to save notes: ${error.message}`),
  });

  const removeMutation = api.userBids.remove.useMutation({
    onSuccess: () => {
      toast.success("Bid deleted");
      invalidateBids();
    },
    onError: (error) => {
      toast.error(`Failed to delete bid: ${error.message}`);
    },
  });

  const setStatusMutation = api.userBids.setStatus.useMutation({
    ...createOptimisticMutationCallbacks<
      { id: string; status: UserBidStatus },
      RouterOutputs["userBids"]["listMine"] | undefined
    >({
      cancel: () => utils.userBids.listMine.cancel(),
      getSnapshot: () => utils.userBids.listMine.getData(),
      // Optimistically mirror server demoteSiblingBids: chosen bid gets
      // `status`, siblings on same class go to PARTICIPATED. Any divergence
      // is reconciled by the invalidate on settle.
      applyOptimistic: ({ id, status }) => {
        utils.userBids.listMine.setData(undefined, (old) => {
          if (!old) return old;
          const target = old.find((b) => b.id === id);
          const classId = target?.classId;
          return old.map((b) => {
            if (b.id === id) return { ...b, status } as typeof b;
            if (classId && b.classId === classId)
              return { ...b, status: "PARTICIPATED" } as typeof b;
            return b;
          });
        });
      },
      restoreSnapshot: (prev) =>
        utils.userBids.listMine.setData(undefined, prev),
      // Single settle-time refresh of both bid queries; onSuccess only
      // handles the timetable-side invalidations.
      invalidate: async () => {
        await Promise.all([
          utils.userBids.listMine.invalidate(),
          utils.userBids.getByClassIds.invalidate(),
        ]);
      },
    }),
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "PLANNED"
          ? "Bid reverted to planned"
          : `Bid marked as ${BID_STATUS_LABELS[variables.status].toLowerCase()}`,
      );
      // The grid reflects a newly-secured class (and drops it when the bid
      // leaves SECURED), so refresh the active arrangement + plan list too.
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
      if (effectiveTermId) {
        void utils.timetable.listMine.invalidate({
          acadTermId: effectiveTermId,
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // ---- Full-edit dialog state ----
  const [editingBid, setEditingBid] = useState<BidRow | null>(null);

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

  // Add this row's class to the active timetable for the current term.
  const addSlotMutation = api.timetable.addSlot.useMutation({
    onSuccess: (data, variables) => {
      const bid = (bidsQuery.data ?? []).find(
        (b) => b.classId === variables.classId,
      );
      const label = bid ? `${bid.courseCode} ${bid.section}` : "Class";
      if (data.created) {
        toast.success(`Added ${label} to timetable`);
      } else {
        toast.info(`${label} is already in timetable`);
      }
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
    },
    onError: (error) => {
      toast.error(`Failed to add to timetable: ${error.message}`);
    },
  });

  const handleAddToTimetable = (classId: string) => {
    if (!activeTimetableId) {
      toast.error("No active timetable for this term");
      return;
    }
    addSlotMutation.mutate({ timetableId: activeTimetableId, classId });
  };

  // ---- Render ----
  if (bidsQuery.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const isBusy =
    updateNotesMutation.isPending ||
    removeMutation.isPending ||
    setStatusMutation.isPending;

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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={effectiveTermId ?? undefined}
          onValueChange={(v) => setTermFilter(v)}
        >
          <SelectTrigger size="sm" className="w-44" aria-label="Filter by term">
            <SelectValue placeholder="Term" />
          </SelectTrigger>
          <SelectContent>
            {(termsQuery.data ?? []).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roundFilter} onValueChange={setRoundFilter}>
          <SelectTrigger
            size="sm"
            className="w-32"
            aria-label="Filter by round"
          >
            <SelectValue placeholder="Round" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All rounds</SelectItem>
            {roundOptions.map((r) => (
              <SelectItem key={r} value={r}>
                Round {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={windowFilter} onValueChange={setWindowFilter}>
          <SelectTrigger
            size="sm"
            className="w-32"
            aria-label="Filter by window"
          >
            <SelectValue placeholder="Window" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All windows</SelectItem>
            {windowOptions.map((w) => (
              <SelectItem key={w} value={String(w)}>
                Window {w}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setShowAddDialog(true)}
          disabled={!effectiveTermId}
        >
          <Plus className="size-3.5" />
          Add bid
        </Button>
      </div>

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
                          | { classId: string }
                          | undefined
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
                onAddToTimetable={() => handleAddToTimetable(bid.classId)}
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

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

function BidTableRow({
  bid,
  isBusy,
  pendingAddClassId,
  hasActiveTimetable,
  onSaveNotes,
  onShowClassInfo,
  onEdit,
  onAddToTimetable,
  onSetStatus,
  onDelete,
}: {
  bid: BidRow;
  isBusy: boolean;
  pendingAddClassId: string | null;
  hasActiveTimetable: boolean;
  onSaveNotes: (notes: string | null) => Promise<void>;
  onShowClassInfo: () => void;
  onEdit: () => void;
  onAddToTimetable: () => void;
  onSetStatus: (status: UserBidStatus) => void;
  onDelete: () => void;
}) {
  const rowAdding = pendingAddClassId === bid.classId;
  return (
    <tr className="border-b last:border-0">
      <Td className="whitespace-nowrap">
        R{bid.bidWindow.round} W{bid.bidWindow.window}
      </Td>
      <Td className="font-medium whitespace-nowrap">
        <ClassInfoButton onClick={onShowClassInfo}>
          {bid.courseCode}
        </ClassInfoButton>
      </Td>
      <Td className="max-w-44 break-words whitespace-normal">
        <ClassInfoButton onClick={onShowClassInfo}>
          {bid.courseName}
        </ClassInfoButton>
      </Td>
      <Td>
        <ClassInfoButton onClick={onShowClassInfo}>
          {bid.section}
        </ClassInfoButton>
      </Td>
      <Td className="max-w-36 truncate" title={bid.professorName ?? undefined}>
        {bid.professorName ? (
          <ClassInfoButton onClick={onShowClassInfo}>
            {bid.professorName}
          </ClassInfoButton>
        ) : (
          "TBA"
        )}
      </Td>
      <Td className="text-right font-mono tabular-nums">
        {formatBidAmount(bid.bidAmount)}
      </Td>
      <Td className="min-w-40">
        <InlineNotesEditor
          key={`${bid.id}:${bid.notes ?? ""}`}
          bidId={bid.id}
          initialNotes={bid.notes}
          disabled={isBusy}
          onSave={onSaveNotes}
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={onAddToTimetable}
                disabled={!hasActiveTimetable || isBusy || rowAdding}
                aria-label={`Add ${bid.courseCode} ${bid.section} to timetable`}
              >
                {rowAdding ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <CalendarPlus className="size-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hasActiveTimetable
                ? "Add to timetable"
                : "No active timetable for this term"}
            </TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onEdit}
            disabled={isBusy}
          >
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs",
                  bidChipVariant(bid.status as UserBidStatus),
                )}
                disabled={isBusy}
                aria-label={`Change status for ${bid.courseCode} ${bid.section} bid`}
              >
                {BID_STATUS_LABELS[bid.status as UserBidStatus] ?? bid.status}
                <ChevronDown className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {BID_STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  disabled={bid.status === opt.value}
                  onClick={() => onSetStatus(opt.value)}
                  className={bidChipVariant(opt.value)}
                >
                  <span className="size-2 shrink-0 rounded-full bg-current opacity-60" />
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive h-7 px-2 text-xs"
                    disabled={isBusy}
                    aria-label={`Delete bid for ${bid.courseCode} ${bid.section}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>Delete bid</TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this bid?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes your {formatBidAmount(bid.bidAmount)} bid for{" "}
                  {bid.courseCode} {bid.section} (R{bid.bidWindow.round} W
                  {bid.bidWindow.window}). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Class-info modal + shared form pieces
// ---------------------------------------------------------------------------

/**
 * Opens the unified BidDialog in class mode for a bid row's class. The dialog
 * resolves the full course details (credit units, timings, professor) itself
 * from the term-scoped course search.
 */
function BidClassInfoPanel({
  bid,
  onClose,
}: {
  bid: BidRow;
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

/** Clickable class cell: opens the class-info modal for the row's class. */
function ClassInfoButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:text-primary cursor-pointer text-left break-words hover:underline"
    >
      {children}
    </button>
  );
}
