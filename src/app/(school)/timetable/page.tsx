"use client";

import { useEffect, useMemo, useCallback, useRef, useState, Suspense } from "react";
import type { CSSProperties } from "react";
import type { SetStateAction, WritableAtom } from "jotai";
import {
  keepPreviousData,
  useIsMutating,
  useMutationState,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayoutGrid,
  CalendarDays,
  LogIn,
  Search,
  Undo2,
  Redo2,
  Check,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import {
  selectedTermIdAtom,
  activeTimetableIdAtom,
  timetableViewAtom,
  searchPanelWidthAtom,
  hasSeenTimetableTourAtom,
} from "@/modules/timetable/atoms/timetable";
import { slotBidsAtom } from "@/modules/timetable/atoms/bids";
import {
  canRedoAtom,
  canUndoAtom,
  pushHistoryAtom,
  redoStackAtom,
  undoStackAtom,
} from "@/modules/timetable/atoms/history";
import { useTimetableHistory } from "@/modules/timetable/hooks/use-timetable-history";
import { useRemoveSlotMutation } from "@/modules/timetable/hooks/use-slot-mutations";
import { TimetableGrid } from "@/modules/timetable/components/TimetableGrid";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";
import type { BidInfo } from "@/modules/timetable/components/TimetableSlotCard";
import { TermPicker } from "@/modules/timetable/components/TermPicker";
import { VariantSwitcher } from "@/modules/timetable/components/VariantSwitcher";
import { CourseSearchPanel } from "@/modules/timetable/components/CourseSearchPanel";
import { CreditTotalBadge } from "@/modules/timetable/components/CreditTotalBadge";
import { SlotBidPanel } from "@/modules/timetable/components/SlotBidPanel";
import { BidsTable } from "@/modules/timetable/components/BidsTable";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { Skeleton } from "@/common/components/skeleton";
import { ShareDialog } from "@/modules/sharing/components/ShareDialog";
import { CalendarExportPopover } from "@/modules/timetable/components/CalendarExportPopover";
import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import { PageTitle } from "@/common/components/page-title";
import { ResizeHandle } from "@/common/components/resize-handle";
import { TourReplayButton } from "@/common/tour/TourReplayButton";
import { timetableTourSteps } from "@/common/tour/steps";
import { useAutoStartTour } from "@/common/tour/useAutoStartTour";

// =============================================================================
// Page
// =============================================================================

// ---------------------------------------------------------------------------
// useClampedPanelWidth — inlined from src/common/hooks/useClampedPanelWidth.ts
// ---------------------------------------------------------------------------
function useClampedPanelWidth<T extends number>(
  atom: WritableAtom<T, [SetStateAction<T>], void>,
  min: number,
  max: number,
) {
  const [width, setWidth] = useAtom(atom);
  return {
    width,
    clamp: (deltaX: number) =>
      // Functional update: apply the incremental drag delta to the LATEST
      // width. ResizeHandle keeps its original pointermove closure for the
      // whole drag, so reading the render-scope `width` here would replay
      // every delta against the drag-start width — the panel jitters
      // (stretches, then shrinks) instead of accumulating the drag distance.
      setWidth((prev) => Math.max(min, Math.min(max, prev + deltaX)) as T),
    style: { "--panel-width": `${width}px` } as CSSProperties,
  };
}

// ---------------------------------------------------------------------------
// Save-status indicator — inlined from
// src/common/components/save-status-indicator.tsx
// ---------------------------------------------------------------------------
type SaveStatus = "saved" | "saving" | "failed";
const WATCHED_MUTATION_KEY_PREFIXES = ["timetable", "userBids"] as const;
function isPrefixMatch(filter: unknown, key: unknown): boolean {
  if (filter === key) return true;
  if (typeof filter !== typeof key) return false;
  if (
    filter !== null &&
    key !== null &&
    typeof filter === "object" &&
    typeof key === "object"
  ) {
    return Object.keys(filter).every((k) =>
      isPrefixMatch(
        (filter as Record<string, unknown>)[k],
        (key as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}
function isWatchedMutationKey(key: unknown): boolean {
  return WATCHED_MUTATION_KEY_PREFIXES.some((prefix) =>
    isPrefixMatch([[prefix]], key),
  );
}
function clearFailedMutations(queryClient: QueryClient): void {
  const mutationCache = queryClient.getMutationCache();
  for (const mutation of mutationCache.getAll()) {
    if (
      mutation.state.status === "error" &&
      isWatchedMutationKey(mutation.options.mutationKey)
    ) {
      mutationCache.remove(mutation);
    }
  }
}
function SaveStatusIndicatorView({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry?: () => void;
}) {
  if (status === "saving") {
    return (
      <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="text-error inline-flex items-center gap-1.5 text-xs hover:underline"
        data-test="save-status-retry"
      >
        <TriangleAlert className="size-3" /> Failed to save. Click to retry
      </button>
    );
  }
  return (
    <span
      className="text-muted-foreground inline-flex items-center gap-1.5 text-xs"
      data-test="save-status-saved"
    >
      <Check className="size-3" /> All changes saved
    </span>
  );
}
function SaveStatusIndicator({ onRetry }: { onRetry: () => void }) {
  const queryClient = useQueryClient();
  const saving =
    useIsMutating({ mutationKey: [["timetable"]] }) +
    useIsMutating({ mutationKey: [["userBids"]] });
  const failed =
    useMutationState({
      filters: { mutationKey: [["timetable"]], status: "error" },
    }).length +
    useMutationState({
      filters: { mutationKey: [["userBids"]], status: "error" },
    }).length;
  const status: SaveStatus =
    saving > 0 ? "saving" : failed > 0 ? "failed" : "saved";
  useEffect(() => {
    const mutationCache = queryClient.getMutationCache();
    return mutationCache.subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "success" &&
        isWatchedMutationKey(event.mutation.options.mutationKey)
      ) {
        clearFailedMutations(queryClient);
      }
    });
  }, [queryClient]);
  useEffect(() => {
    if (status === "failed") {
      toast.error("Couldn't save your changes.", {
        id: "save-status-failed",
        duration: Infinity,
      });
    } else {
      toast.dismiss("save-status-failed");
    }
  }, [status]);
  return (
    <SaveStatusIndicatorView
      status={status}
      onRetry={() => {
        clearFailedMutations(queryClient);
        void queryClient.resumePausedMutations();
        onRetry();
      }}
    />
  );
}

export default function TimetablePage() {
  const selectedTermId = useAtomValue(selectedTermIdAtom);
  const [activeTimetableId, setActiveTimetableId] = useAtom(
    activeTimetableIdAtom,
  );
  const [view, setView] = useAtom(timetableViewAtom);
  const setSlotBids = useSetAtom(slotBidsAtom);
  const { data: session, status: sessionStatus } = useSession();
  const isLoggedIn = !!session;

  // ---- Product tour: auto-start once per browser (replay via help icon) ----
  const [hasSeenTour, setHasSeenTour] = useAtom(hasSeenTimetableTourAtom);
  useAutoStartTour(timetableTourSteps, {
    hasSeen: hasSeenTour,
    onDone: useCallback(() => setHasSeenTour(true), [setHasSeenTour]),
  });

  // ---- Resizable search panel (lg+ only; width persisted) ----
  const searchPanel = useClampedPanelWidth(searchPanelWidthAtom, 260, 560);

  const utils = api.useUtils();

  // ---- Client-side undo/redo for timetable actions (Ctrl/Cmd+Z etc.) ----
  const { undo, redo } = useTimetableHistory();
  const pushHistory = useSetAtom(pushHistoryAtom);
  const setUndoStack = useSetAtom(undoStackAtom);
  const setRedoStack = useSetAtom(redoStackAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);

  // ---- Slot bid panel state ----
  const [selectedSlot, setSelectedSlot] = useState<ArrangedClass | null>(null);

  // ---- On term change: clear stale state so nothing from the old term
  // renders while the new term's timetables load (2g) ----
  const prevTermRef = useRef(selectedTermId);
  useEffect(() => {
    if (prevTermRef.current === selectedTermId) return;
    prevTermRef.current = selectedTermId;
    setActiveTimetableId(null);
    setSlotBids({});
    setSelectedSlot(null);
    // History is per-term/plan — don't let it leak across term switches.
    setUndoStack([]);
    setRedoStack([]);
  }, [selectedTermId, setActiveTimetableId, setSlotBids, setUndoStack, setRedoStack]);

  // ---- On plan switch (within a term, via VariantSwitcher): history is
  // per-plan — Ctrl+Z after switching plans must not pop the previous
  // plan's action and mutate a plan the user is no longer viewing.
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, [activeTimetableId, setUndoStack, setRedoStack]);

  // ---- Remove-slot mutation (grid X affordance) ----
  // Shared optimistic hook (same config the undo/redo history executes).
  const removeSlotMutation = useRemoveSlotMutation();

  const handleSlotRemove = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      // Guard against rapid repeat clicks queueing duplicate deletes.
      if (removeSlotMutation.isPending) return;
      removeSlotMutation.mutate({ timetableId: activeTimetableId, classId });
      // Record for undo/redo — the inverse (addSlot) runs through the same
      // shared mutation config.
      pushHistory({
        type: "removeSlot",
        timetableId: activeTimetableId,
        classId,
      });
    },
    [activeTimetableId, removeSlotMutation, pushHistory],
  );

  // ---- On mount / term change: ensure a default timetable exists ----
  const createMutation = api.timetable.create.useMutation({
    onSuccess: (created) => {
      void utils.timetable.listMine.invalidate({
        acadTermId: selectedTermId!,
      });
      setActiveTimetableId(created.id);
    },
  });

  const { data: timetables, isLoading: timetablesLoading } =
    api.timetable.listMine.useQuery(
      { acadTermId: selectedTermId ?? "" },
      { enabled: !!selectedTermId && isLoggedIn },
    );

  // Auto-create default timetable if none exist for the term
  useEffect(() => {
    if (
      isLoggedIn &&
      selectedTermId &&
      !timetablesLoading &&
      timetables &&
      timetables.length === 0
    ) {
      createMutation.mutate({ acadTermId: selectedTermId });
    }
    // Only run when term changes or list resolves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, selectedTermId, timetablesLoading, timetables?.length === 0]);

  // Auto-select first timetable when list loads and none is active
  useEffect(() => {
    if (timetables && timetables.length > 0 && !activeTimetableId) {
      const active = timetables.find((t) => t.isActive);
      setActiveTimetableId(active?.id ?? timetables[0]!.id);
    }
  }, [timetables, activeTimetableId, setActiveTimetableId]);

  // ---- Arrangement query ----
  const {
    data: arrangement,
    isLoading: arrangementLoading,
    error: arrangementError,
  } = api.timetable.getArrangement.useQuery(
    { timetableId: activeTimetableId ?? "" },
    {
      enabled: !!activeTimetableId,
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    },
  );

  useEffect(() => {
    if (arrangementError) {
      toast.error("Failed to load timetable arrangement");
    }
  }, [arrangementError]);

  // ---- Derived data ----
  const activeTimetable = useMemo(
    () => timetables?.find((t) => t.id === activeTimetableId) ?? null,
    [timetables, activeTimetableId],
  );

  /** The plan starred active for this term (what bids sync to), if any. */
  const activePlan = useMemo(
    () => timetables?.find((t) => t.isActive) ?? null,
    [timetables],
  );

  const classes: ArrangedClass[] = useMemo(
    () => arrangement?.slots ?? [],
    [arrangement],
  );

  // `getArrangement` co-locates bids with slots in the SAME round-trip so
  // bid-status colours land with the grid (no second-query waterfall that
  // first paints every card with `courseColor` then flips to status colour
  // when getByClassIds resolves). The old getByClassIds path is retained
  // only as a fallback — see bidsMap below.
  type ArrangementBids = NonNullable<typeof arrangement>["bids"];
  const arrangementBids = useMemo<ArrangementBids>(
    () => arrangement?.bids ?? [],
    [arrangement?.bids],
  );
  const hasArrangementBids = arrangementBids.length > 0;

  // Keep a fallback for code paths that write bids without refreshing the
  // arrangement (BidDialog status changes, BidsTable). With keepPreviousData
  // the fallback holds its previous value while the new key refetches.
  const classIds = useMemo(() => classes.map((c) => c.classId), [classes]);
  const { data: fallbackBidsData } = api.userBids.getByClassIds.useQuery(
    { classIds },
    {
      enabled: isLoggedIn && classIds.length > 0 && !hasArrangementBids,
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    },
  );
  const effectiveBids: ArrangementBids = useMemo(
    () =>
      hasArrangementBids
        ? arrangementBids
        : ((fallbackBidsData as unknown as ArrangementBids) ?? []),
    [hasArrangementBids, arrangementBids, fallbackBidsData],
  );

  // Sync the single source of bids into Jotai for SlotBidPanel consumers,
  // and build the per-slot info for the grid chips.
  useEffect(() => {
    if (effectiveBids.length === 0 && !arrangement) return;
    const grouped: Record<string, ArrangementBids> = {};
    for (const bid of effectiveBids) {
      const arr = grouped[bid.classId] ?? (grouped[bid.classId] = []);
      arr.push(bid);
    }
    setSlotBids(grouped);
  }, [effectiveBids, arrangement, setSlotBids]);

  /** Map of classId → BidInfo for chip display on the grid. */
  const bidsMap = useMemo<Record<string, BidInfo>>(() => {
    if (effectiveBids.length === 0) return {};
    const map: Record<string, BidInfo> = {};
    for (const bid of effectiveBids) {
      map[bid.classId] ??= {
        amount: bid.bidAmount,
        round: bid.bidWindow.round,
        status: bid.status,
      };
    }
    return map;
  }, [effectiveBids]);

  // Set of course codes present in the active timetable (for swap detection)
  const timetableCourseCodes = useMemo(() => {
    const set = new Set<string>();
    for (const slot of classes) {
      set.add(slot.courseCode);
    }
    return set;
  }, [classes]);

  // Callback when a slot card is clicked in the grid
  const handleSlotClick = useCallback(
    (classId: string) => {
      const slot = classes.find((c) => c.classId === classId);
      if (slot) setSelectedSlot(slot);
    },
    [classes],
  );

  // Empty-state CTA: bring the course search input to the user.
  const focusCourseSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(
      '[data-test="timetable-search-input"]',
    );
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }, []);

  // ---- Render ----
  return (
    <div className="flex flex-col gap-4">
      {/* Page header — matches the Roadmaps page pattern */}
      <div>
        <PageTitle className="text-left text-2xl md:text-2xl! font-bold tracking-tight">Timetable</PageTitle>
        <p className="text-muted-foreground text-sm">
          Plan your classes, track bids and share your schedule.
        </p>
      </div>

      {/* Top bar: term picker + variant switcher + view toggle + CU badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {/* Suspense required: TermPicker reads ?acadTermId= via useSearchParams */}
          <Suspense fallback={<Skeleton className="h-9 w-56" />}>
            <TermPicker />
          </Suspense>
          {isLoggedIn && <VariantSwitcher />}
          <SaveStatusIndicator
            onRetry={() => {
              if (activeTimetableId) {
                void utils.timetable.getArrangement.invalidate({
                  timetableId: activeTimetableId,
                });
              }
              void utils.userBids.listMine.invalidate();
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Undo"
            data-test="timetable-undo"
            disabled={!canUndo}
            onClick={undo}
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Redo"
            data-test="timetable-redo"
            disabled={!canRedo}
            onClick={redo}
          >
            <Redo2 className="size-4" />
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View toggle: Classes / Exams */}
          <ToggleGroup
            type="single"
            variant="segmented"
            value={view}
            onValueChange={(v) => {
              if (v) setView(v as "classes" | "exams");
            }}
          >
            <ToggleGroupItem value="classes" aria-label="Classes view">
              <LayoutGrid className="size-4" />
              <span className="ml-1.5 hidden sm:inline">Classes</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="exams" aria-label="Exams view">
              <CalendarDays className="size-4" />
              <span className="ml-1.5 hidden sm:inline">Exams</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {isLoggedIn && activeTimetable && (
            <>
              <CalendarExportPopover timetableId={activeTimetable.id} />
              <ShareDialog
                entity="timetable"
                entityId={activeTimetable.id}
                visibility={activeTimetable.visibility}
                shareToken={activeTimetable.shareToken}
                onChanged={() => {
                  if (selectedTermId) {
                    void utils.timetable.listMine.invalidate({
                      acadTermId: selectedTermId,
                    });
                  }
                }}
              />
            </>
          )}

          <TourReplayButton steps={timetableTourSteps} />

          {isLoggedIn && <CreditTotalBadge />}
        </div>
      </div>

      {/* Main content: left (grid) + right (search) */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left: timetable grid */}
        <div className="min-w-0 flex-1">
          {/* Timetable section header — plan-scoped content */}
          <div className="mb-3">
            <h2 className="text-lg font-semibold">Class timetable</h2>
            <p className="text-muted-foreground text-sm">
              Showing the active plan for the selected term. Use the plan
              switcher above to compare variants; the star marks your active
              plan.
            </p>
          </div>

          {/* No term selected */}
          {!selectedTermId && (
            <EmptyState
              className="min-h-[400px]"
              icon={<CalendarDays />}
              title="Pick a term to start"
              description="Choose an academic term above to view or build your timetable."
            />
          )}

          {/* Loading */}
          {selectedTermId &&
            (sessionStatus === "loading" ||
              (isLoggedIn && (timetablesLoading || arrangementLoading))) && (
              <div className="space-y-3">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-[500px] w-full rounded-lg" />
              </div>
            )}

          {/* Logged out: invite login instead of firing protected queries */}
          {selectedTermId && sessionStatus !== "loading" && !isLoggedIn && (
            <EmptyState
              className="min-h-[400px]"
              icon={<LogIn />}
              title="Log in to build your timetable"
              description="Browse courses in the search panel, or log in to save timetables, track bids and share your schedule."
              action={
                <Button asChild>
                  <Link href="/account/auth/login?callbackUrl=%2Ftimetable">
                    Log in
                  </Link>
                </Button>
              }
            />
          )}

          {/* Empty timetable */}
          {selectedTermId &&
            isLoggedIn &&
            !timetablesLoading &&
            !arrangementLoading &&
            activeTimetableId &&
            classes.length === 0 && (
              <EmptyState
                className="min-h-[300px]"
                icon={<Search />}
                title="No classes added yet"
                description="Search for courses in the panel on the right to start building your timetable."
                action={
                  <Button onClick={focusCourseSearch}>
                    Add your first course
                  </Button>
                }
              />
            )}

          {/* Grid */}
          {selectedTermId &&
            isLoggedIn &&
            !timetablesLoading &&
            activeTimetableId &&
            classes.length > 0 && (
              <TimetableGrid
                classes={classes}
                view={view}
                highlightNow
                readOnly={false}
                onSlotClick={handleSlotClick}
                onSlotRemove={handleSlotRemove}
                removeDisabled={removeSlotMutation.isPending}
                bids={bidsMap}
              />
            )}

          {/* Bidding section — term-scoped, separated from the plan above */}
          {selectedTermId && isLoggedIn && (
            <section className="border-border mt-8 flex flex-col gap-3 border-t pt-6">
              <div>
                <h2 className="text-lg font-semibold">Your bids</h2>
                <p className="text-muted-foreground text-sm">
                  Bids are tracked per academic term, not per plan — they apply
                  to every timetable variant in this term.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {activePlan
                    ? `Bids synced to active plan: ${activePlan.name}`
                    : "No active plan — star a plan to mark it active for this term."}
                </p>
              </div>
              <BidsTable />
            </section>
          )}
        </div>

        {/* Right: search panel — user-resizable on lg+, scrolls internally */}
        {selectedTermId && (
          <div
            className="relative w-full shrink-0 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100vh-7rem)] lg:w-[var(--panel-width)] lg:flex-col"
            style={searchPanel.style}
          >
            {/* Drag handle on the panel's left edge (lg+ only) */}
            <ResizeHandle
              label="Drag to resize search panel"
              onDelta={(dx) => searchPanel.clamp(-dx)}
              className="group absolute top-0 -left-3 z-20 h-full w-3"
            />
            <CourseSearchPanel
              timetableCourseCodes={timetableCourseCodes}
              existingSlots={classes}
              className="min-h-0 flex-1"
            />
          </div>
        )}
      </div>

      {/* Slot bid panel (dialog) — the unified BidDialog in class mode */}
      {selectedSlot && selectedTermId && (
        <SlotBidPanel
          classId={selectedSlot.classId}
          courseCode={selectedSlot.courseCode}
          section={selectedSlot.section}
          acadTermId={selectedTermId}
          isOpen
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
