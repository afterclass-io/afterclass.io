"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { api } from "@/common/tools/trpc/react";
import type { RouterInputs, RouterOutputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { cn } from "@/common/functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
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
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { pickCurrentBidWindow } from "@/modules/timetable/functions/current-window";
import { formatBidAmount } from "@/modules/timetable/functions/format";
import { BID_STATUS_OPTIONS } from "@/modules/timetable/functions/bid-status";
import type { UserBidStatus } from "@/modules/timetable/functions/bid-status";
import { resolveBidDialogNotes } from "@/modules/timetable/functions/bid-dialog-notes";
import { z } from "zod";
import { ClassInfoCard } from "./ClassInfoCard";
import { BidPredictionPanel } from "./BidPredictionPanel";
import { InlineNotesEditor } from "./InlineNotesEditor";

const bidAmountSchema = z
  .number({ error: "Enter a valid bid amount" })
  .positive("Bid must be greater than 0")
  .max(99999, "Bid cannot exceed e$99,999");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserBidRow = RouterOutputs["userBids"]["listMine"][number];

type SearchCourse = RouterOutputs["timetable"]["searchCourses"][number];

export type BidDialogProps = {
  /** "add" (bids table), "edit" (bids table), "class" (slot card / class cells). */
  mode: "add" | "edit" | "class";
  /** The bid being edited (mode="edit"); ignored in other modes. */
  bid?: UserBidRow | null;
  /** Preselected class (mode="class", or a preselected add). */
  classId?: string;
  /** Preselected course code (mode="class", or a preselected add). */
  courseCode?: string;
  /** Preselected section (mode="class", or a preselected add). */
  section?: string;
  acadTermId: string;
  /** Window preselected in add mode (current/upcoming); ignored when editing. */
  defaultWindowId?: number;
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
    return { error: result.error.issues[0]?.message ?? "Invalid amount" };
  return { value: result.data };
}

// ---------------------------------------------------------------------------
// Course + section picker (term-scoped, shared by add & edit forms)
// ---------------------------------------------------------------------------

/**
 * Two grid cells: a course search (term-scoped via `timetable.searchCourses`)
 * and a section select fed by the chosen course. Rendered as a fragment so
 * the cells participate in the parent's grid.
 */
function CourseSectionPicker({
  acadTermId,
  course,
  onCourseChange,
  classId,
  onClassChange,
}: {
  acadTermId: string;
  course: SearchCourse | null;
  onCourseChange: (course: SearchCourse | null) => void;
  classId: string | null;
  onClassChange: (classId: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const searchQuery = api.timetable.searchCourses.useQuery(
    { acadTermId, query: debouncedQuery },
    {
      enabled: !course && debouncedQuery.length > 0,
      staleTime: 30_000,
    },
  );

  const courses = useMemo(
    () => (course ? [] : (searchQuery.data ?? [])),
    [course, searchQuery.data],
  );

  return (
    <>
      {/* Course search (term-scoped) */}
      <div className="space-y-1.5">
        <Label>Course</Label>
        {course ? (
          <div className="border-border flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-sm">
            <span className="truncate">
              {course.code} — {course.name}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Clear selected course"
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => onCourseChange(null)}
                >
                  <X className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Clear selected course</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <>
            <Input
              placeholder="Search code, name or professor…"
              aria-label="Search courses"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {debouncedQuery.length > 0 && (
              <div className="border-border max-h-40 overflow-y-auto rounded-md border">
                {searchQuery.isLoading && (
                  <p className="text-muted-foreground p-2 text-xs">
                    Searching…
                  </p>
                )}
                {!searchQuery.isLoading && courses.length === 0 && (
                  <p className="text-muted-foreground p-2 text-xs">
                    No courses match this term.
                  </p>
                )}
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="hover:bg-muted/50 block w-full px-2 py-1.5 text-left text-sm"
                    onClick={() => {
                      onCourseChange(c);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium">{c.code}</span>{" "}
                    <span className="text-muted-foreground">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Section picker */}
      <div className="space-y-1.5">
        <Label>Section</Label>
        <Select
          value={classId ?? undefined}
          onValueChange={onClassChange}
          disabled={!course}
        >
          <SelectTrigger size="sm" aria-label="Select section">
            <SelectValue
              placeholder={course ? "Select section…" : "Pick a course first"}
            />
          </SelectTrigger>
          <SelectContent>
            {(course?.sections ?? []).map((s) => (
              <SelectItem key={s.classId} value={s.classId}>
                {s.section}
                {s.professorName ? ` · ${s.professorName}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Destination selector (historical data / course reviews / professor reviews)
// ---------------------------------------------------------------------------

/**
 * Three link-buttons under the class info card pointing at the existing
 * destination pages for the selected class. Each destination is a full page,
 * so the row reads as a selector over the three available views rather than
 * a tab switch. The professor link only renders when the class has a
 * professor slug (TBA classes have none — same rule as ReviewCtaButtons).
 */
function DestinationSelector({
  courseCode,
  section,
  classId,
  professorSlug,
}: {
  courseCode: string;
  section: string;
  classId: string;
  professorSlug: string | null;
}) {
  return (
    <div
      className="flex flex-nowrap items-center gap-2 overflow-x-auto"
      data-test="class-destinations"
    >
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link
          href={`/bidding/analytics?course=${courseCode}&section=${section}&classId=${classId}`}
        >
          Historical Data
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="shrink-0" asChild>
        <Link href={`/course/${courseCode}`}>Course Reviews</Link>
      </Button>
      {professorSlug && (
        <Button variant="outline" size="sm" className="shrink-0" asChild>
          <Link href={`/professor/${professorSlug}`}>Professor Reviews</Link>
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Unified bid dialog
// ---------------------------------------------------------------------------

/**
 * One shared bid dialog for every bid flow:
 *
 * - add mode: pick a course + section, then class info / prediction / "Your
 *   bid" appear; save through `userBids.upsert`.
 * - edit mode: every field prefilled from the bid; save through
 *   `userBids.update`.
 * - class mode (slot card / class cells): class preselected, picker hidden,
 *   "Remove class" retained; save through `userBids.upsert`.
 *
 * Round + window are a single dropdown fed by `timetable.getBidWindows`,
 * defaulting to the current/upcoming window in add/class mode. Notes are per
 * bid window: switching windows loads that window's saved notes.
 */
export function BidDialog({
  mode,
  bid,
  classId,
  courseCode,
  section,
  acadTermId,
  defaultWindowId,
  isOpen,
  onClose,
}: BidDialogProps) {
  const utils = api.useUtils();
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);

  // ---- Course/section known at mount ----
  // add mode can open with a preselected course+section (e.g. stories);
  // edit/class modes always know the class up front.
  const initialCourseCode =
    mode === "edit" ? (bid?.courseCode ?? null) : (courseCode ?? null);
  const initialClassId =
    mode === "edit" ? (bid?.classId ?? null) : (classId ?? null);

  const [selectedCourse, setSelectedCourse] = useState<SearchCourse | null>(
    () =>
      initialCourseCode
        ? {
            // Placeholder carrying just the known section; the full course
            // (name, credit units, timings) is swapped in once the term-scoped
            // search by course code resolves.
            id: "",
            code: initialCourseCode,
            name: mode === "edit" ? (bid?.courseName ?? "") : initialCourseCode,
            creditUnits: 0,
            sections:
              initialClassId != null
                ? [
                    {
                      classId: initialClassId,
                      section:
                        mode === "edit"
                          ? (bid?.section ?? "")
                          : (section ?? ""),
                      professorName:
                        mode === "edit" ? (bid?.professorName ?? null) : null,
                      timings: [],
                      examTimings: [],
                    },
                  ]
                : [],
          }
        : null,
  );
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    initialClassId,
  );

  // Resolve the full course (name, credit units, section timings) for the
  // known course code — the bid/slot only carries code + section.
  const resolveCourseQuery = api.timetable.searchCourses.useQuery(
    { acadTermId, query: initialCourseCode ?? "" },
    { enabled: !!initialCourseCode, staleTime: 60_000 },
  );

  useEffect(() => {
    // Only replace the placeholder (id === ""), never a user choice.
    if (!initialCourseCode || !selectedCourse || selectedCourse.id !== "")
      return;
    const match = resolveCourseQuery.data?.find(
      (c) => c.code === initialCourseCode,
    );
    if (match) setSelectedCourse(match);
  }, [resolveCourseQuery.data, selectedCourse, initialCourseCode]);

  // The course currently in play: picker-chosen in add mode, otherwise the
  // resolved full course (falling back to the placeholder).
  const activeCourse = useMemo(() => {
    if (mode === "add" && !initialCourseCode) return selectedCourse;
    return (
      resolveCourseQuery.data?.find((c) => c.code === initialCourseCode) ??
      selectedCourse
    );
  }, [mode, initialCourseCode, resolveCourseQuery.data, selectedCourse]);

  const activeSection = useMemo(
    () =>
      activeCourse?.sections.find((s) => s.classId === selectedClassId) ?? null,
    [activeCourse, selectedClassId],
  );

  // ---- Derived display values ----
  const courseCodeLabel = activeCourse?.code ?? initialCourseCode ?? "";
  const courseNameLabel =
    activeCourse?.name ??
    (mode === "edit" ? bid?.courseName : courseCodeLabel) ??
    "";
  const sectionLabel =
    activeSection?.section ?? (mode === "edit" ? bid?.section : section) ?? "";
  const professorName =
    activeSection?.professorName ??
    (mode === "edit" ? bid?.professorName : null);
  const creditUnits = activeCourse?.creditUnits ?? 0;
  const timings = activeSection?.timings ?? [];
  const examTimings = activeSection?.examTimings ?? [];

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
  const invalidateBidQueries = useCallback(async () => {
    await utils.userBids.listMine.invalidate();
    await utils.userBids.getByClassIds.invalidate();
    if (activeTimetableId) {
      await utils.timetable.getArrangement.invalidate({
        timetableId: activeTimetableId,
      });
    }
  }, [utils, activeTimetableId]);

  const upsertMutation = api.userBids.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["upsert"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Pattern B: the caller does NOT apply optimistically — new rows appear
      // via the invalidate refetch.
      applyOptimistic: () => undefined,
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: invalidateBidQueries,
      onError: (message) => toast.error(`Failed to save bid: ${message}`),
    }),
    onSuccess: () => {
      toast.success(`Bid saved for ${courseCodeLabel} ${sectionLabel}`);
      onClose();
    },
  });

  const updateMutation = api.userBids.update.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["update"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Pattern B: the caller does NOT apply optimistically — updated rows
      // appear via the invalidate refetch.
      applyOptimistic: () => undefined,
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: invalidateBidQueries,
      onError: (message) => toast.error(`Failed to update bid: ${message}`),
    }),
    onSuccess: () => {
      toast.success(`Bid updated for ${courseCodeLabel} ${sectionLabel}`);
      onClose();
    },
  });

  // ---- Class-mode only: remove slot + existing-bids status/notes ----
  const removeSlotMutation = api.timetable.removeSlot.useMutation({
    onSuccess: () => {
      toast.success(
        `Removed ${courseCodeLabel} ${sectionLabel} from timetable`,
      );
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

  // Filter classes for invalidation: only siblings sharing classId can
  // change via demoteSiblingBids (same-window siblings become PARTICIPATED).
  const setStatusMutation = api.userBids.setStatus.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["userBids"]["setStatus"],
      unknown
    >({
      cancel: () =>
        utils.userBids.getByClassIds.cancel({
          classIds: [selectedClassId ?? ""],
        }),
      getSnapshot: () =>
        utils.userBids.getByClassIds.getData({
          classIds: [selectedClassId ?? ""],
        }),
      // Optimistically mirror the server's demoteSiblingBids rule:
      // set the chosen bid to `status`, and any sibling on the same class
      // to PARTICIPATED. The invalidation below reconciles races.
      applyOptimistic: ({ id, status }) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          (old) =>
            old?.map((bid) => {
              if (bid.id === id) return { ...bid, status };
              if (bid.classId === selectedClassId)
                return { ...bid, status: "PARTICIPATED" };
              return bid;
            }),
        );
      },
      restoreSnapshot: (prev) => {
        utils.userBids.getByClassIds.setData(
          { classIds: [selectedClassId ?? ""] },
          prev as never,
        );
      },
      invalidate: async () => {
        await utils.userBids.getByClassIds.invalidate();
        await utils.userBids.listMine.invalidate();
        // The grid reflects a newly-secured class (and drops it when the bid
        // leaves SECURED), so refresh the active arrangement + plan list too.
        if (activeTimetableId) {
          await utils.timetable.getArrangement.invalidate({
            timetableId: activeTimetableId,
          });
        }
        await utils.timetable.listMine.invalidate({ acadTermId });
      },
      onError: () => toast.error("Failed to update bid status"),
    }),
  });

  const updateNotesMutation = api.userBids.update.useMutation({
    onSuccess: () => {
      toast.success("Notes saved");
      void utils.userBids.getByClassIds.invalidate();
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  // ---- Derived ----
  const isSaving = upsertMutation.isPending || updateMutation.isPending;
  const isRemoving = removeSlotMutation.isPending;
  const pickerVisible = mode !== "class";
  const showLowerSections = classKnown;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        data-test="bid-dialog"
        className="max-h-[85vh] overflow-y-auto sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === "add"
              ? "Add a bid"
              : mode === "edit"
                ? `Edit bid — ${courseCodeLabel} ${sectionLabel}`
                : courseNameLabel}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Pick a course and section, choose a round and window, and set your bid amount."
              : mode === "edit"
                ? "Change the course or section, move the bid to another round or window, or update the amount and notes."
                : courseCodeLabel}
          </DialogDescription>
        </DialogHeader>

        {pickerVisible && (
          <div className="grid gap-3 sm:grid-cols-2">
            <CourseSectionPicker
              acadTermId={acadTermId}
              course={selectedCourse}
              onCourseChange={(c) => {
                setSelectedCourse(c);
                setSelectedClassId(null);
              }}
              classId={selectedClassId}
              onClassChange={setSelectedClassId}
            />
          </div>
        )}

        {showLowerSections && (
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
                  {bidWindowsQuery.isLoading && (
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
                  {!bidWindowsQuery.isLoading &&
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
                            ? `Results: ${new Date(bid.bidWindow.resultsAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" })}`
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
              disabled={
                isSaving || !selectedBidWindowId || !bidAmountRaw.trim()
              }
            >
              {isSaving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {mode === "edit" ? "Save changes" : "Save bid"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
