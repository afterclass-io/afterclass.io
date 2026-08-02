"use client";

import { useEffect, useMemo, useCallback, useRef, useState, Suspense } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { LayoutGrid, CalendarDays, LogIn, Search } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import {
  selectedTermIdAtom,
  activeTimetableIdAtom,
  timetableViewAtom,
  searchPanelWidthAtom,
  hasSeenTimetableTourAtom,
} from "@/modules/timetable/atoms/timetable";
import { slotBidsAtom } from "@/modules/timetable/atoms/bids";
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
import { ResizeHandle } from "@/common/components/resize-handle";
import { useClampedPanelWidth } from "@/common/hooks/useClampedPanelWidth";
import { TourReplayButton } from "@/common/tour/TourReplayButton";
import { timetableTourSteps } from "@/common/tour/steps";
import { useAutoStartTour } from "@/common/tour/useAutoStartTour";

// =============================================================================
// Page
// =============================================================================

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
  }, [selectedTermId, setActiveTimetableId, setSlotBids]);

  // ---- Remove-slot mutation (grid X affordance) ----
  const removeSlotMutation = api.timetable.removeSlot.useMutation({
    onSuccess: () => {
      if (activeTimetableId) {
        void utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId,
        });
      }
      toast.success("Removed class from timetable");
    },
    onError: (error) => {
      toast.error(`Failed to remove class: ${error.message}`);
    },
  });

  const handleSlotRemove = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      // Guard against rapid repeat clicks queueing duplicate deletes.
      if (removeSlotMutation.isPending) return;
      removeSlotMutation.mutate({ timetableId: activeTimetableId, classId });
    },
    [activeTimetableId, removeSlotMutation],
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

  // Extract all classIds from the current arrangement
  const classIds = useMemo(() => classes.map((c) => c.classId), [classes]);

  // ---- Bid data for all slots (batched single query) ----
  const { data: userBidsData } = api.userBids.getByClassIds.useQuery(
    { classIds },
    { enabled: isLoggedIn && classIds.length > 0, staleTime: 30_000 },
  );

  // Sync bid data into Jotai atom and build per-slot BidInfo map
  useEffect(() => {
    if (userBidsData) {
      const grouped: Record<string, typeof userBidsData> = {};
      for (const bid of userBidsData) {
        const arr = grouped[bid.classId] ?? (grouped[bid.classId] = []);
        arr.push(bid);
      }
      setSlotBids(grouped);
    }
  }, [userBidsData, setSlotBids]);

  /** Map of classId → BidInfo for chip display on the grid. */
  const bidsMap = useMemo<Record<string, BidInfo>>(() => {
    if (!userBidsData) return {};
    const map: Record<string, BidInfo> = {};
    for (const bid of userBidsData) {
      // Take the first (most recent) bid per class for the chip
      map[bid.classId] ??= {
        amount: bid.bidAmount,
        round: bid.bidWindow.round,
        status: bid.status,
      };
    }
    return map;
  }, [userBidsData]);

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
        <h1 className="text-2xl font-bold tracking-tight">Timetable</h1>
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
              className="min-h-0 flex-1"
            />
          </div>
        )}
      </div>

      {/* Slot bid panel (dialog) */}
      {selectedSlot && selectedTermId && (
        <SlotBidPanel
          classId={selectedSlot.classId}
          courseCode={selectedSlot.courseCode}
          courseName={selectedSlot.courseName}
          section={selectedSlot.section}
          professorName={selectedSlot.professorName}
          creditUnits={selectedSlot.creditUnits}
          timings={selectedSlot.timings}
          examTimings={selectedSlot.examTimings}
          acadTermId={selectedTermId}
          isOpen
          onClose={() => setSelectedSlot(null)}
        />
      )}
    </div>
  );
}
