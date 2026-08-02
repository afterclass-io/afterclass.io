"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import {
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
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
import { selectedTermIdAtom } from "@/modules/timetable/atoms/timetable";
import { pickCurrentBidWindow } from "@/modules/timetable/functions/current-window";
import {
  formatBidAmount,
  formatDateSG,
} from "@/modules/timetable/functions/format";
import {
  BID_STATUS_LABELS,
  BID_STATUS_OPTIONS,
  bidChipVariant,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";
import { BidsDashboard } from "./BidsDashboard";
import { SlotBidPanel } from "./SlotBidPanel";
import { InlineNotesEditor } from "./InlineNotesEditor";
import { EditBidDialog } from "./EditBidDialog";
import { Th, SortableTh, Td } from "./table-primitives";

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
 * - Sorting: by bid amount and date saved.
 * - Notes: inline-editable, auto-saved on blur.
 * - Course code/name/section open the calendar's class-info modal
 *   (SlotBidPanel) for that class.
 * - Actions: Edit/Delete plus a status menu (planned/secured/dropped/
 *   cancelled).
 * - "Add bid" opens the same bid dialog used for editing, with empty
 *   defaults, to plan a bid without going through the calendar slot panel.
 */
export function BidsTable() {
  const utils = api.useUtils();
  const selectedTermId = useAtomValue(selectedTermIdAtom);

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

  // ---- Class-info modal (SlotBidPanel) opened from a row's class cells ----
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

  const upsertMutation = api.userBids.upsert.useMutation({
    onSuccess: () => {
      toast.success("Bid updated");
      invalidateBids();
    },
    onError: (error) => {
      toast.error(`Failed to save bid: ${error.message}`);
    },
  });

  const updateMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Bid updated");
      invalidateBids();
    },
    onError: (error) => {
      toast.error(`Failed to update bid: ${error.message}`);
    },
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
    onSuccess: (_data, variables) => {
      toast.success(
        variables.status === "PLANNED"
          ? "Bid reverted to planned"
          : `Bid marked as ${BID_STATUS_LABELS[variables.status].toLowerCase()}`,
      );
      invalidateBids();
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // ---- Full-edit dialog state ----
  const [editingBid, setEditingBid] = useState<BidRow | null>(null);

  // ---- Derived rows ----
  const termLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of termsQuery.data ?? []) map.set(t.id, t.label);
    return map;
  }, [termsQuery.data]);

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

  // ---- Render ----
  if (bidsQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const isBusy =
    upsertMutation.isPending ||
    updateMutation.isPending ||
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
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b">
              <Th>Term</Th>
              <Th>Round</Th>
              <Th>Window</Th>
              <Th>Course Code</Th>
              <Th>Course Name</Th>
              <Th>Section</Th>
              <Th>Professor</Th>
              <Th className="text-right">Median Bid</Th>
              <Th className="text-right">Min Bid</Th>
              <SortableTh
                label="My Bid"
                active={sortKey === "bidAmount"}
                dir={sortDir}
                onClick={() => toggleSort("bidAmount")}
                className="text-right"
              />
              <Th>Notes</Th>
              <SortableTh
                label="Date Saved"
                active={sortKey === "createdAt"}
                dir={sortDir}
                onClick={() => toggleSort("createdAt")}
              />
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredBids.length === 0 && (
              <tr>
                <td
                  colSpan={13}
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
                termLabel={
                  termLabelById.get(bid.bidWindow.acadTermId) ??
                  bid.bidWindow.acadTermId
                }
                isBusy={isBusy}
                onSaveNotes={async (notes) =>
                  upsertMutation.mutate({
                    classId: bid.classId,
                    bidWindowId: bid.bidWindowId,
                    bidAmount: bid.bidAmount,
                    notes: notes ?? "",
                  })
                }
                onShowClassInfo={() => setClassInfoBid(bid)}
                onEdit={() => setEditingBid(bid)}
                onSetStatus={(status) =>
                  setStatusMutation.mutate({ id: bid.id, status })
                }
                onDelete={() => removeMutation.mutate({ id: bid.id })}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Bid dialog — shared by add (empty defaults) and edit */}
      {bidDialogAcadTermId && (
        <EditBidDialog
          key={editingBid?.id ?? "add"}
          bid={editingBid}
          acadTermId={bidDialogAcadTermId}
          defaultWindowId={currentWindow?.id ?? null}
          isSaving={
            editingBid ? updateMutation.isPending : upsertMutation.isPending
          }
          onClose={() => {
            setEditingBid(null);
            setShowAddDialog(false);
          }}
          onSubmit={(values) => {
            if (editingBid) {
              updateMutation.mutate(
                { id: editingBid.id, ...values },
                { onSuccess: () => setEditingBid(null) },
              );
            } else {
              upsertMutation.mutate(
                { ...values, notes: values.notes ?? undefined },
                { onSuccess: () => setShowAddDialog(false) },
              );
            }
          }}
        />
      )}

      {/* Class-info modal (same panel the calendar opens on slot click) */}
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
  termLabel,
  isBusy,
  onSaveNotes,
  onShowClassInfo,
  onEdit,
  onSetStatus,
  onDelete,
}: {
  bid: BidRow;
  termLabel: string;
  isBusy: boolean;
  onSaveNotes: (notes: string | null) => Promise<void>;
  onShowClassInfo: () => void;
  onEdit: () => void;
  onSetStatus: (status: UserBidStatus) => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b last:border-0">
      <Td className="whitespace-nowrap">{termLabel}</Td>
      <Td>{bid.bidWindow.round}</Td>
      <Td>{bid.bidWindow.window}</Td>
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
        <ClassInfoButton onClick={onShowClassInfo}>{bid.section}</ClassInfoButton>
      </Td>
      <Td className="max-w-36 truncate" title={bid.professorName ?? undefined}>
        {bid.professorName ?? "TBA"}
      </Td>
      <Td className="text-right font-mono tabular-nums">
        {bid.bidResult?.median != null
          ? formatBidAmount(bid.bidResult.median)
          : "—"}
      </Td>
      <Td className="text-right font-mono tabular-nums">
        {bid.bidResult?.min != null ? formatBidAmount(bid.bidResult.min) : "—"}
      </Td>
      <Td className="text-right font-mono tabular-nums">
        {formatBidAmount(bid.bidAmount)}
      </Td>
      <Td className="min-w-44">
        <InlineNotesEditor
          key={`${bid.id}:${bid.notes ?? ""}`}
          initialNotes={bid.notes}
          disabled={isBusy}
          onSave={onSaveNotes}
        />
      </Td>
      <Td className="whitespace-nowrap">{formatDateSG(bid.createdAt)}</Td>
      <Td>
        <div className="flex items-center gap-1">
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
                >
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
 * Opens the calendar's class-info modal (SlotBidPanel) for a bid row. The bid
 * row doesn't carry credit units or meeting/exam timings, so they're filled
 * in from the term-scoped course search by matching course code + classId.
 */
function BidClassInfoPanel({
  bid,
  onClose,
}: {
  bid: BidRow;
  onClose: () => void;
}) {
  const acadTermId = bid.bidWindow.acadTermId;
  const courseQuery = api.timetable.searchCourses.useQuery(
    { acadTermId, query: bid.courseCode },
    { staleTime: 60_000 },
  );
  const course = courseQuery.data?.find((c) => c.code === bid.courseCode);
  const section = course?.sections.find((s) => s.classId === bid.classId);

  return (
    <SlotBidPanel
      classId={bid.classId}
      courseCode={bid.courseCode}
      courseName={bid.courseName}
      section={bid.section}
      professorName={bid.professorName}
      creditUnits={course?.creditUnits ?? 0}
      timings={section?.timings ?? []}
      examTimings={section?.examTimings ?? []}
      acadTermId={acadTermId}
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
