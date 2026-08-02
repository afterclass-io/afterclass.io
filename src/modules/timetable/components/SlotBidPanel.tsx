"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { BookOpen, Loader2, Trash2 } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { cn } from "@/common/functions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/common/components/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/card";
import { Button } from "@/common/components/button";
import { Label } from "@/common/components/label";
import { Input } from "@/common/components/input";
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
import { BID_STATUS_OPTIONS } from "@/modules/timetable/functions/bid-status";
import { bidAmountSchema } from "@/modules/timetable/functions/bid-schema";
import { SuccessRateSlider } from "@/modules/bidding/components/SuccessRateSlider";
import { computeRecommendedRange } from "@/modules/bidding/utils/bid-prediction";
import type { ClassTimingLike } from "@/modules/timetable/functions/slot-math";
import type { ClassExamTiming } from "./TimetableGrid";
import { InlineNotesEditor } from "./InlineNotesEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  classId: string;
  courseCode: string;
  courseName: string;
  section: string;
  professorName?: string | null;
  creditUnits: number;
  timings: ClassTimingLike[];
  examTimings: ClassExamTiming[];
  acadTermId: string;
  isOpen: boolean;
  onClose: () => void;
};

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
    return { error: result.error.errors[0]?.message ?? "Invalid amount" };
  return { value: result.data };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A detail panel (dialog) that opens when the owner clicks a timetable slot.
 *
 * Leads with class information (mirroring the /bidding/analytics class info
 * card: course, professor, section, meeting + exam schedule, link to the
 * course reviews page), then shows the predicted clearing range and the bid
 * form below.
 */
export function SlotBidPanel({
  classId,
  courseCode,
  courseName,
  section,
  professorName,
  creditUnits,
  timings,
  examTimings,
  acadTermId,
  isOpen,
  onClose,
}: Props) {
  const utils = api.useUtils();
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);

  // ---- Local form state ----
  const [bidAmountRaw, setBidAmountRaw] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [selectedBidWindowId, setSelectedBidWindowId] = useState<
    string | undefined
  >(undefined);

  // ---- Data queries ----
  const predictionQuery = api.bidPredictions.getBy.useQuery(
    { classId },
    { enabled: isOpen, staleTime: 60_000 },
  );

  const bidWindowsQuery = api.timetable.getBidWindows.useQuery(
    { acadTermId },
    { enabled: isOpen, staleTime: 60_000 },
  );

  // Safety factors power the success-rate slider (same model as
  // /bidding/analytics: recommended = predicted + multiplier × uncertainty).
  const safetyFactorsQuery = api.safetyFactors.getAll.useQuery(undefined, {
    enabled: isOpen,
    staleTime: 300_000,
  });

  // Success-rate the predicted min/median assume (matches analytics' 70%
  // default).
  const [beatsPercentage, setBeatsPercentage] = useState(70);

  const bidWindows = useMemo(
    () => bidWindowsQuery.data ?? [],
    [bidWindowsQuery.data],
  );

  // Default the selector to the current/upcoming bid window for this term
  useEffect(() => {
    if (selectedBidWindowId || bidWindows.length === 0) return;
    const current = pickCurrentBidWindow(bidWindows);
    if (current) setSelectedBidWindowId(String(current.id));
  }, [bidWindows, selectedBidWindowId]);

  // ---- Upsert mutation ----
  const upsertMutation = api.userBids.upsert.useMutation({
    onSuccess: () => {
      toast.success(`Bid saved for ${courseCode} ${section}`);
      void utils.userBids.getByClassIds.invalidate();
      void utils.userBids.listMine.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to save bid: ${error.message}`);
    },
  });

  // ---- Remove-slot mutation ----
  const removeSlotMutation = api.timetable.removeSlot.useMutation({
    onSuccess: () => {
      toast.success(`Removed ${courseCode} ${section} from timetable`);
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to remove class: ${error.message}`);
    },
  });

  // ---- Existing bids query ----
  const existingBidsQuery = api.userBids.getByClassIds.useQuery(
    { classIds: [classId] },
    { enabled: isOpen, staleTime: 30_000 },
  );

  const existingBids = existingBidsQuery.data ?? [];

  // ---- Set status mutation (optimistic) ----
  const setStatusMutation = api.userBids.setStatus.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.userBids.getByClassIds.cancel();
      const prev = utils.userBids.getByClassIds.getData({
        classIds: [classId],
      });
      utils.userBids.getByClassIds.setData({ classIds: [classId] }, (old) =>
        old?.map((bid) => (bid.id === id ? { ...bid, status } : bid)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.userBids.getByClassIds.setData({ classIds: [classId] }, ctx.prev);
      }
      toast.error("Failed to update bid status");
    },
    onSettled: () => {
      void utils.userBids.getByClassIds.invalidate({ classIds: [classId] });
      void utils.userBids.listMine.invalidate();
    },
  });

  // ---- Update notes mutation ----
  const updateNotesMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      void utils.userBids.getByClassIds.invalidate({ classIds: [classId] });
      void utils.userBids.listMine.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to save notes: ${error.message}`);
    },
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
    // Validate
    const parsed = parseBidAmount(bidAmountRaw);
    if ("error" in parsed) {
      setAmountError(parsed.error);
      return;
    }
    if (!selectedBidWindowId) {
      toast.error("Please select a bid window");
      return;
    }

    upsertMutation.mutate({
      classId,
      bidWindowId: Number(selectedBidWindowId),
      bidAmount: parsed.value,
    });
  }, [bidAmountRaw, selectedBidWindowId, classId, upsertMutation]);

  const handleRemove = useCallback(() => {
    if (!activeTimetableId) return;
    removeSlotMutation.mutate({ timetableId: activeTimetableId, classId });
  }, [activeTimetableId, classId, removeSlotMutation]);

  // Reset form when dialog opens/closes
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setBidAmountRaw("");
        setAmountError(null);
        setSelectedBidWindowId(undefined);
        onClose();
      }
    },
    [onClose],
  );

  // ---- Derived ----
  const prediction = predictionQuery.data;
  const isSaving = upsertMutation.isPending;
  const isRemoving = removeSlotMutation.isPending;
  const datedExamTimings = examTimings.filter((t) => t.date);

  // Confidence-adjusted recommendations (same formula as analytics, via the
  // shared math: predicted + multiplier × uncertainty, multiplier from the
  // empirical safety factors for the prediction's term at the chosen
  // success rate). These respond to the success-rate slider below.
  const recommended = useMemo(
    () =>
      prediction
        ? computeRecommendedRange(
            prediction,
            safetyFactorsQuery.data ?? [],
            beatsPercentage,
          )
        : null,
    [prediction, safetyFactorsQuery.data, beatsPercentage],
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{courseName}</DialogTitle>
          <DialogDescription>{courseCode}</DialogDescription>
        </DialogHeader>

        {/* ---- Class information (leads, mirrors /bidding/analytics) ---- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Class Information</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Professor</span>
                <p className="font-medium">{professorName ?? "TBA"}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">Section</span>
                <p className="font-medium">{section}</p>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">
                  Credit Units
                </span>
                <p className="font-medium">{creditUnits}</p>
              </div>
            </div>

            {/* Meeting Information — BOSS-style table */}
            {timings.length > 0 || datedExamTimings.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="py-1 pr-3 text-left font-medium">Type</th>
                    <th className="py-1 pr-3 text-left font-medium">Day</th>
                    <th className="py-1 pr-3 text-left font-medium">Time</th>
                    <th className="py-1 text-left font-medium">Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {timings.map((t, i) => (
                    <tr
                      key={`class-${i}`}
                      className="border-border/50 border-b"
                    >
                      <td className="py-1.5 pr-3 font-medium">Class</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {t.dayOfWeek ?? "—"}
                      </td>
                      <td className="py-1.5 pr-3 font-mono whitespace-nowrap tabular-nums">
                        {t.startTime}-{t.endTime}
                      </td>
                      <td className="text-foreground py-1.5">
                        {t.venue ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {datedExamTimings.map((t, i) => (
                    <tr key={`exam-${i}`} className="border-border/50 border-b">
                      <td className="py-1.5 pr-3 font-medium">Exam</td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {t.dayOfWeek && (
                          <>
                            <br />
                            <span>{t.dayOfWeek}</span>
                          </>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 font-mono whitespace-nowrap tabular-nums">
                        {t.startTime}-{t.endTime}
                      </td>
                      <td className="text-foreground py-1.5">
                        {t.venue ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                No schedule data available
              </p>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/course/${courseCode}`}>
                  <BookOpen className="size-3.5" />
                  Course reviews
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ---- Bid prediction (analytics-style summary) ---- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bid Prediction</CardTitle>
            {prediction && (
              <CardDescription className="flex flex-col gap-0.5">
                <span>
                  {courseCode} {section} · {prediction.bidWindow.acadTermId}
                </span>
                <span>
                  Round {prediction.bidWindow.round} · Window{" "}
                  {prediction.bidWindow.window}
                </span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {predictionQuery.isLoading && (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            )}
            {predictionQuery.isError && (
              <p className="text-muted-foreground text-sm">
                Unable to load prediction.
              </p>
            )}
            {prediction && recommended && (
              <>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      Recommended Min
                    </span>
                    <p className="text-primary font-mono text-xl font-bold tabular-nums">
                      {formatBidAmount(recommended.min)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      predicted {formatBidAmount(prediction.minPredicted)} ±{" "}
                      {formatBidAmount(prediction.minUncertainty)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground text-xs">
                      Recommended Median
                    </span>
                    <p className="text-primary font-mono text-xl font-bold tabular-nums">
                      {formatBidAmount(recommended.median)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      predicted {formatBidAmount(prediction.medianPredicted)} ±{" "}
                      {formatBidAmount(prediction.medianUncertainty)}
                    </p>
                  </div>
                </div>
                <div className="border-border mt-3 border-t pt-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs">
                    <span className="text-muted-foreground">
                      Estimated success rate
                    </span>
                    <span className="text-foreground font-medium">
                      {beatsPercentage}%
                    </span>
                  </div>
                  <SuccessRateSlider
                    value={beatsPercentage}
                    defaultValue={70}
                    onChange={(v) =>
                      setBeatsPercentage(Array.isArray(v) ? v[0]! : v)
                    }
                    wrapperClassName="px-1 pt-1 pb-5"
                  />
                  <p className="text-muted-foreground text-xs">
                    Recommended = predicted + multiplier × uncertainty; higher
                    confidence widens the safety band.{" "}
                    <Link
                      href={`/bidding/analytics?course=${courseCode}&section=${section}&classId=${classId}`}
                      className="text-primary hover:underline"
                    >
                      Full analytics
                    </Link>
                  </p>
                </div>
              </>
            )}
            {!predictionQuery.isLoading &&
              !predictionQuery.isError &&
              !prediction && (
                <p className="text-muted-foreground text-sm">
                  No prediction available for this class yet.
                </p>
              )}
          </CardContent>
        </Card>

        {/* ---- Bid form ---- */}
        <div className="space-y-3">
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
              aria-describedby={amountError ? "bid-amount-error" : undefined}
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

          <div className="space-y-1.5">
            <Label>Bid window</Label>
            {bidWindowsQuery.isLoading && <Skeleton className="h-9 w-full" />}
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
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue placeholder="Select a bid window…" />
                </SelectTrigger>
                <SelectContent>
                  {bidWindows.map((bw) => (
                    <SelectItem key={bw.id} value={String(bw.id)}>
                      R{bw.round} W{bw.window}
                      {bw.closesAt
                        ? ` (closes ${new Date(bw.closesAt).toLocaleDateString("en-SG", { month: "short", day: "numeric" })})`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!bidWindowsQuery.isLoading &&
              !bidWindowsQuery.isError &&
              bidWindows.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No bid windows found for this term.
                </p>
              )}
          </div>
        </div>

        {/* ---- Existing bids ---- */}
        {existingBids.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              Existing bids
            </p>
            {existingBids.map((bid) => {
              const resultsOut =
                !!bid.bidWindow.resultsAt &&
                new Date(bid.bidWindow.resultsAt) <= new Date();
              const statusOptions = BID_STATUS_OPTIONS.filter(
                (o) => o.value !== "DROPPED" && o.value !== "CANCELLED",
              );

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
                        ? `Results: ${new Date(bid.bidWindow.resultsAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Results date not set"}
                    </p>
                    {/* Keyed on notes so local state resets after a save */}
                    <InlineNotesEditor
                      key={`${bid.id}:${bid.notes ?? ""}`}
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
                              status: value as "PLANNED" | "SECURED" | "MISSED",
                            });
                          }}
                          disabled={!resultsOut || setStatusMutation.isPending}
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

        <DialogFooter className="gap-2 sm:justify-between">
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                isSaving || !selectedBidWindowId || !bidAmountRaw.trim()
              }
            >
              {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Save bid
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
