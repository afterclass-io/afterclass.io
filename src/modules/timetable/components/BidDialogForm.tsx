"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { cn } from "@/common/functions";
import { DialogFooter } from "@/common/components/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { Button } from "@/common/components/button";
import { Label } from "@/common/components/label";
import { Input } from "@/common/components/input";
import { Textarea } from "@/common/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import { Skeleton } from "@/common/components/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { pickCurrentBidWindow } from "@/modules/timetable/functions/current-window";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import {
  BID_STATUS_OPTIONS,
  type UserBidStatus,
} from "@/modules/timetable/functions/bid-status";
import { resolveBidDialogNotes } from "@/modules/timetable/functions/bid-dialog-notes";
import { useBidDialogMutations } from "@/modules/timetable/hooks/use-bid-dialog-mutations";
import { z } from "zod";
import type { BidDialogProps } from "./BidDialog";
import { ClassInfoCard, type ClassInfoCardProps } from "./ClassInfoCard";
import { DestinationSelector } from "./DestinationSelector";
import { BidPredictionPanel } from "./BidPredictionPanel";
import { InlineNotesEditor } from "./InlineNotesEditor";

const bidAmountSchema = z
  .number({ error: "Enter a valid bid amount" })
  .positive("Bid must be greater than 0")
  .max(99999, "Bid cannot exceed e$99,999");

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function parseBidAmount(raw: string): { value: number } | { error: string } {
  const trimmed = raw.trim();
  if (trimmed === "") return { error: "Bid amount is required" };
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) return { error: "Enter a valid number" };
  const result = bidAmountSchema.safeParse(parsed);
  if (!result.success)
    return { error: result.error.issues[0]?.message ?? "Invalid amount" };
  return { value: result.data };
}

export type BidDialogFormProps = Pick<
  BidDialogProps,
  "mode" | "bid" | "acadTermId" | "defaultWindowId" | "isOpen" | "onClose"
> & {
  /** The class picked in the dialog, or null while none is chosen. */
  selectedClassId: string | null;
  /** Display values for the selected class. */
  classInfo: ClassInfoCardProps;
};

/**
 * Everything under the course picker in the bid dialog: class info,
 * prediction, the "Your bid" form, existing bids (class mode) and the footer
 * actions. It owns the bid form state and the mutations.
 */
export function BidDialogForm({
  mode,
  bid,
  acadTermId,
  defaultWindowId,
  isOpen,
  onClose,
  selectedClassId,
  classInfo,
}: BidDialogFormProps) {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const {
    courseCode: courseCodeLabel,
    courseName: courseNameLabel,
    section: sectionLabel,
    professorName,
    creditUnits,
    timings,
    examTimings,
  } = classInfo;

  const classKnown = !!selectedClassId;

  // Professor slug for the "Professor Reviews" destination — bid/course data
  // only carries the professor's name, so resolve the slug from the class.
  const professorQuery = api.professors.getProfessorsByClassId.useQuery(
    { classId: selectedClassId ?? "" },
    {
      enabled: isOpen && !!selectedClassId && !!professorName,
      staleTime: 60_000,
    },
  );
  const professorSlug = professorQuery.data?.[0]?.slug ?? null;

  // ---- Bid windows (single round+window dropdown) ----
  const bidWindowsQuery = api.timetable.getBidWindows.useQuery(
    { acadTermId },
    { enabled: isOpen, staleTime: 60_000 },
  );

  const bidWindows = useMemo(
    () => bidWindowsQuery.data ?? [],
    [bidWindowsQuery.data],
  );

  const [selectedBidWindowId, setSelectedBidWindowId] = useState<
    string | undefined
  >(mode === "edit" && bid ? String(bid.bidWindowId) : undefined);

  // Add/class mode: default to the current/upcoming window once windows load.
  useEffect(() => {
    if (mode === "edit" || selectedBidWindowId || bidWindows.length === 0)
      return;
    const current = pickCurrentBidWindow(bidWindows);
    const fallback =
      current ??
      (defaultWindowId != null
        ? bidWindows.find((w) => w.id === defaultWindowId)
        : undefined) ??
      bidWindows[0];
    // Query data determines the initial window after the dialog has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync the resolved window into dialog state
    if (fallback) setSelectedBidWindowId(String(fallback.id));
  }, [mode, selectedBidWindowId, bidWindows, defaultWindowId]);

  const selectedWindow = useMemo(
    () => bidWindows.find((w) => w.id === Number(selectedBidWindowId)),
    [bidWindows, selectedBidWindowId],
  );

  // ---- Form state ----
  const [bidAmountRaw, setBidAmountRaw] = useState(
    mode === "edit" && bid ? String(bid.bidAmount) : "",
  );
  const [amountError, setAmountError] = useState<string | null>(null);
  const [notes, setNotes] = useState(
    mode === "edit" && bid ? (bid.notes ?? "") : "",
  );

  // ---- Existing bids for the selected class (notes + class-mode list) ----
  const classBidsQuery = api.userBids.getByClassIds.useQuery(
    { classIds: selectedClassId ? [selectedClassId] : [] },
    { enabled: isOpen && !!selectedClassId, staleTime: 30_000 },
  );
  const classBids = useMemo(
    () => classBidsQuery.data ?? [],
    [classBidsQuery.data],
  );

  // Notes are per (class, bid window): when the selection changes, load that
  // window's saved notes into the textarea (empty when no bid exists there).
  // All transitions live in `resolveBidDialogNotes` (unit-tested) so the
  // dialog's races are covered: the effect never runs against a still-empty
  // getByClassIds cache (which would wipe pre-filled notes in edit mode), and
  // in edit mode the notes pre-filled from `bid` are never overwritten.
  const [loadedNotesKey, setLoadedNotesKey] = useState<string | null>(null);
  const classBidsSettled = classBidsQuery.isFetched || classBidsQuery.isSuccess;
  useEffect(() => {
    const result = resolveBidDialogNotes({
      mode,
      bid,
      selectedClassId,
      selectedBidWindowId,
      classBids,
      loadedNotesKey,
      classBidsSettled,
    });
    // This effect synchronizes fetched notes with the controlled form fields.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- apply query-backed notes to form state
    if (result.notes !== undefined) setNotes(result.notes);
    if (result.loadedNotesKey !== undefined)
      setLoadedNotesKey(result.loadedNotesKey);
  }, [
    mode,
    bid,
    selectedClassId,
    selectedBidWindowId,
    classBids,
    loadedNotesKey,
    classBidsSettled,
  ]);

  // ---- Mutations ----
  const {
    upsertMutation,
    updateMutation,
    removeSlotMutation,
    setStatusMutation,
    updateNotesMutation,
  } = useBidDialogMutations({
    acadTermId,
    selectedClassId,
    activeTimetableId,
    courseCodeLabel,
    sectionLabel,
    onClose,
  });

  // ---- Handlers ----
  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setBidAmountRaw(raw);
      if (raw.trim() === "") {
        setAmountError(null);
        return;
      }
      const parsed = parseBidAmount(raw);
      if ("error" in parsed) {
        setAmountError(parsed.error);
      } else {
        setAmountError(null);
      }
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (!selectedClassId) {
      toast.error("Pick a course and section first");
      return;
    }
    if (!selectedBidWindowId) {
      toast.error("Pick a bid window");
      return;
    }
    const parsed = parseBidAmount(bidAmountRaw);
    if ("error" in parsed) {
      setAmountError(parsed.error);
      return;
    }
    const trimmedNotes = notes.trim();
    if (mode === "edit" && bid) {
      updateMutation.mutate({
        id: bid.id,
        classId: selectedClassId,
        bidWindowId: Number(selectedBidWindowId),
        bidAmount: parsed.value,
        notes: trimmedNotes === "" ? null : trimmedNotes,
      });
    } else {
      upsertMutation.mutate({
        classId: selectedClassId,
        bidWindowId: Number(selectedBidWindowId),
        bidAmount: parsed.value,
        notes: trimmedNotes === "" ? undefined : trimmedNotes,
      });
    }
  }, [
    selectedClassId,
    selectedBidWindowId,
    bidAmountRaw,
    notes,
    mode,
    bid,
    updateMutation,
    upsertMutation,
  ]);

  const handleRemove = useCallback(() => {
    if (!activeTimetableId || !selectedClassId) return;
    removeSlotMutation.mutate({
      timetableId: activeTimetableId,
      classId: selectedClassId,
    });
  }, [activeTimetableId, selectedClassId, removeSlotMutation]);

  // ---- Derived ----
  const isSaving = upsertMutation.isPending || updateMutation.isPending;
  const isRemoving = removeSlotMutation.isPending;

  return (
    <>
      {classKnown && (
        <>
          <ClassInfoCard
            courseCode={courseCodeLabel}
            courseName={courseNameLabel}
            section={sectionLabel}
            professorName={professorName}
            creditUnits={creditUnits}
            timings={timings}
            examTimings={examTimings}
          >
            <DestinationSelector
              courseCode={courseCodeLabel}
              section={sectionLabel}
              classId={selectedClassId ?? ""}
              professorSlug={professorSlug}
            />
          </ClassInfoCard>

          <BidPredictionPanel
            classId={selectedClassId ?? ""}
            courseCode={courseCodeLabel}
            section={sectionLabel}
            acadTermId={acadTermId}
            round={selectedWindow?.round}
            window={selectedWindow?.window}
          />

          {/* ---- Your bid ---- */}
          <Card className="gap-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Your bid</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Bid amount */}
              <div className="space-y-1.5">
                <Label htmlFor="bid-amount">Bid amount (e$)</Label>
                <Input
                  id="bid-amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 50"
                  value={bidAmountRaw}
                  onChange={handleAmountChange}
                  disabled={isSaving}
                  aria-invalid={!!amountError}
                  aria-describedby={
                    amountError ? "bid-amount-error" : undefined
                  }
                />
                {amountError && (
                  <p
                    id="bid-amount-error"
                    className="text-destructive text-xs"
                    role="alert"
                  >
                    {amountError}
                  </p>
                )}
              </div>

              {/* Round + window (single dropdown) */}
              <div className="space-y-1.5">
                <Label>Round &amp; window</Label>
                {bidWindowsQuery.isPending && (
                  <Skeleton className="h-9 w-full" />
                )}
                {bidWindowsQuery.isError && (
                  <p className="text-muted-foreground text-sm">
                    Unable to load bid windows.
                  </p>
                )}
                {bidWindows.length > 0 && (
                  <Select
                    value={selectedBidWindowId}
                    onValueChange={setSelectedBidWindowId}
                    disabled={isSaving}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full"
                      aria-label="Select round and window"
                    >
                      <SelectValue placeholder="Select a bid window…" />
                    </SelectTrigger>
                    <SelectContent>
                      {bidWindows.map((w) => (
                        <SelectItem key={w.id} value={String(w.id)}>
                          {`Round ${w.round} · Window ${w.window}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!bidWindowsQuery.isPending &&
                  !bidWindowsQuery.isError &&
                  bidWindows.length === 0 && (
                    <p className="text-muted-foreground text-sm">
                      No bid windows found for this term.
                    </p>
                  )}
              </div>

              {/* Notes (per selected window) */}
              <div className="space-y-1.5">
                <Label htmlFor="bid-notes">Notes (optional)</Label>
                <Textarea
                  id="bid-notes"
                  maxLength={500}
                  placeholder="e.g. must-have for my major"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-16 resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* ---- Existing bids (class-mode context) ---- */}
          {mode === "class" && classBids.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                Existing bids
              </p>
              {classBids.map((bid) => {
                const resultsOut =
                  !!bid.bidWindow.resultsAt &&
                  new Date(bid.bidWindow.resultsAt) <= new Date();
                const statusOptions = BID_STATUS_OPTIONS;

                return (
                  <div
                    key={bid.id}
                    className="border-border bg-muted/30 flex items-center justify-between gap-3 rounded-md border p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        R{bid.bidWindow.round} W{bid.bidWindow.window}
                        <span className="text-muted-foreground ml-2">
                          · {formatBidAmount(bid.bidAmount)}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {bid.bidWindow.resultsAt
                          ? `Results: ${formatDateSGT(bid.bidWindow.resultsAt)}`
                          : "Results date not set"}
                      </p>
                      {/* Keyed on notes so local state resets after a save */}
                      <InlineNotesEditor
                        key={`${bid.id}:${bid.notes ?? ""}`}
                        bidId={bid.id}
                        initialNotes={bid.notes}
                        disabled={updateNotesMutation.isPending}
                        onSave={async (notes) => {
                          updateNotesMutation.mutate({ id: bid.id, notes });
                        }}
                      />
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Select
                            value={bid.status}
                            onValueChange={(value) => {
                              if (value === bid.status) return;
                              setStatusMutation.mutate({
                                id: bid.id,
                                status: value as UserBidStatus,
                              });
                            }}
                            disabled={
                              !resultsOut || setStatusMutation.isPending
                            }
                          >
                            <SelectTrigger
                              size="sm"
                              className="w-28 shrink-0"
                              aria-label={`Status for R${bid.bidWindow.round} W${bid.bidWindow.window} bid`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </span>
                      </TooltipTrigger>
                      {!resultsOut && (
                        <TooltipContent side="left">
                          Results not out yet.
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {mode === "class" && (
          <Button
            variant="outline"
            onClick={handleRemove}
            disabled={isSaving || isRemoving || !activeTimetableId}
            className={cn("text-destructive hover:text-destructive")}
          >
            {isRemoving ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-4" />
            )}
            Remove class
          </Button>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedBidWindowId || !bidAmountRaw.trim()}
          >
            {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {mode === "edit" ? "Save changes" : "Save bid"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}
