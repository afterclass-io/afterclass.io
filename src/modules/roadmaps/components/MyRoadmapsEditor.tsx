"use client";

import { useCallback, useMemo, useState } from "react";
import { useAtom } from "jotai";
import { toast } from "sonner";
import { GitBranch } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";
import {
  isConflictError,
  saveEntriesWithConflictRetry,
} from "@/modules/roadmaps/functions/save-with-retry";
import { findEntryByCourse } from "@/modules/roadmaps/functions/conflicts";
import {
  extractAcadTermCode,
  findAcadTermForRoadmapTerm,
} from "@/modules/roadmaps/functions/term-mapping";
import { hasSeenRoadmapsTourAtom } from "@/modules/roadmaps/atoms/roadmap";
import { useRoadmapMutations } from "@/modules/roadmaps/hooks/use-roadmap-mutations";
import { useRoadmapPanelResize } from "@/modules/roadmaps/hooks/use-roadmap-panel-resize";
import { RoadmapGrid } from "@/modules/roadmaps/components/RoadmapGrid";
import { RoadmapList } from "@/modules/roadmaps/components/RoadmapList";
import { LazyRoadmapTimeline } from "@/modules/roadmaps/components/LazyRoadmapTimeline";
import {
  RoadmapEditorHeader,
  type EditorViewMode,
} from "@/modules/roadmaps/components/RoadmapEditorHeader";
import { CourseSearchSidebar } from "@/modules/roadmaps/components/CourseSearchSidebar";
import { TermTimetableLink } from "@/modules/roadmaps/components/TermTimetableLink";
import { Button } from "@/common/components/button";
import { Skeleton } from "@/common/components/skeleton";
import { EmptyState } from "@/common/components/empty-state";
import { roadmapsTourSteps } from "@/common/tour/steps";
import { useAutoStartTour } from "@/common/tour/useAutoStartTour";
import { ResizeHandle } from "@/common/components/resize-handle";

// =============================================================================
// Constants
// =============================================================================

// =============================================================================
// Helpers
// =============================================================================

/**
 * Academic-year part of an AcadTerm label. Labels are "AY2026/2027 1"
 * (full 4-digit years, unprefixed term) or "AY2024/25 T1" (2-digit year,
 * prefixed term) — both reduce to "AY2026/2027" / "AY2024/25".
 */
function acadYearLabel(label: string): string {
  const match = /^(AY\d{4}\/\d{2,4})/.exec(label.trim());
  return match ? match[1]! : label.trim();
}

/**
 * Academic-year label derived from a raw AcadTerm id ("AY202425T1" →
 * "AY2024/25"). Used as a display fallback when the persisted matric term is
 * no longer present in the (24h-cached) term list, so the Select never blanks
 * out a stored value. Returns null for unrecognised ids.
 */
function acadYearLabelFromTermId(termId: string): string | null {
  const match = /^AY(\d{4})(\d{2})/.exec(termId);
  return match ? `AY${match[1]}/${match[2]}` : null;
}

/**
 * Empty-state CTA: open the roadmap list's create input (it autofocuses).
 * Module-level (no hook) so it can sit below the editor's early returns.
 */
function focusRoadmapCreateInput() {
  document
    .querySelector<HTMLButtonElement>('button[aria-label="Create new roadmap"]')
    ?.click();
}

// =============================================================================
// Component
// =============================================================================

export function MyRoadmapsEditor() {
  const utils = api.useUtils();

  // ---- Server state ----
  const {
    data: roadmapsData,
    isLoading: roadmapsLoading,
    isError: roadmapsError,
    error: roadmapsErrorObj,
  } = api.roadmaps.listMine.useQuery();

  const { data: acadTermsData } = api.acadTerms.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  const { data: facultiesData } = api.faculties.list.useQuery(undefined, {
    staleTime: 5 * 60_000,
  });

  // ---- Local state ----
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [viewMode, setViewMode] = useState<EditorViewMode>("grid");

  // ---- Resizable panel widths (persisted, lg+ only) ----
  const { panelWidths, layoutRef, handleListResize, handleSidebarResize } =
    useRoadmapPanelResize();

  // ---- Product tour: auto-start once per browser (replay via help icon) ----
  const [hasSeenTour, setHasSeenTour] = useAtom(hasSeenRoadmapsTourAtom);
  useAutoStartTour(roadmapsTourSteps, {
    hasSeen: hasSeenTour,
    onDone: useCallback(() => setHasSeenTour(true), [setHasSeenTour]),
  });

  // ---- Derived ----
  const roadmaps = useMemo(
    () =>
      (roadmapsData ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        entryCount: r._count.entries,
        visibility: r.visibility,
        shareToken: r.shareToken,
        facultyId: r.facultyId,
        isActive: r.isActive,
        matricTermId: r.matricTermId,
      })),
    [roadmapsData],
  );

  const selectedRoadmap = useMemo(
    () => roadmaps.find((r) => r.id === selectedId) ?? null,
    [roadmaps, selectedId],
  );

  // Matriculation terms in chronological order (oldest first).
  const matricTermOptions = useMemo(
    () =>
      [...(acadTermsData ?? [])].sort(
        (a, b) => a.startDt.getTime() - b.startDt.getTime(),
      ),
    [acadTermsData],
  );

  // Matriculation is declared per academic year (almost everyone starts in
  // term 1) — group the sorted terms by AY and map each AY to that year's
  // T1 term id (falling back to the AY's earliest term) so the server
  // contract (matricTermId) stays unchanged.
  const matricYearOptions = useMemo(() => {
    const termIdByAy = new Map<string, string>();
    for (const t of matricTermOptions) {
      const ay = acadYearLabel(t.label);
      if (!ay) continue;
      if (!termIdByAy.has(ay) || extractAcadTermCode(t.label) === "T1") {
        termIdByAy.set(ay, t.id);
      }
    }
    // If the persisted matric term is missing from the (24h-cached) term list,
    // derive its AY from the raw id so the Select still renders the stored
    // value instead of blanking out.
    const persistedTermId = selectedRoadmap?.matricTermId;
    if (
      persistedTermId &&
      !matricTermOptions.some((t) => t.id === persistedTermId)
    ) {
      const ay = acadYearLabelFromTermId(persistedTermId);
      if (ay) termIdByAy.set(ay, persistedTermId);
    }
    return [...termIdByAy.entries()].map(([ay, termId]) => ({ ay, termId }));
  }, [matricTermOptions, selectedRoadmap?.matricTermId]);

  const selectedMatricTermId = selectedRoadmap?.matricTermId;
  const selectedMatricAy = useMemo(() => {
    const term = matricTermOptions.find((t) => t.id === selectedMatricTermId);
    if (term) return acadYearLabel(term.label);
    // Fallback: the persisted term isn't in the (24h-cached) options — derive
    // the AY label from the raw id so the Select never blanks out a stored
    // value.
    return selectedMatricTermId
      ? (acadYearLabelFromTermId(selectedMatricTermId) ?? undefined)
      : undefined;
  }, [matricTermOptions, selectedMatricTermId]);

  // ---- Cold-load: auto-select first roadmap (render adjustment, not an
  // effect — converges once selectedId is set) ----
  if (roadmaps.length > 0 && !selectedId) {
    setSelectedId(roadmaps[0]!.id);
  }

  // ---- Entries query (only when a roadmap is selected) ----
  const {
    data: getMineData,
    isLoading: entriesLoading,
    isError: entriesError,
    error: entriesErrorObj,
  } = api.roadmaps.getMine.useQuery(
    { roadmapId: selectedId! },
    { enabled: !!selectedId, staleTime: 10_000 },
  );

  const entries = useMemo<Entry[]>(() => {
    if (!getMineData) return [];
    return getMineData.entries
      .filter(
        (e): e is typeof e & { course: NonNullable<typeof e.course> } =>
          !!(e as { course?: unknown }).course,
      )
      .map((e) => ({
        courseId: e.courseId,
        courseCode: e.course.code,
        courseName: e.course.name,
        creditUnits: e.course.creditUnits,
        description: e.course.description,
        yearNumber: e.yearNumber,
        term: e.term,
      }));
  }, [getMineData]);

  // ---- Mutations ----
  const {
    createMutation,
    renameMutation,
    removeMutation,
    saveEntriesMutation,
    setActiveMutation,
    setMatricTermMutation,
    syncProgressMutation,
    setFacultyMutation,
  } = useRoadmapMutations({ selectedId, setSelectedId, setMutating });

  // ---- Handlers ----
  const handleCreate = useCallback(
    (name: string) => {
      setMutating(true);
      createMutation.mutate({ name });
    },
    [createMutation],
  );

  const handleRename = useCallback(
    (id: string, name: string) => {
      setMutating(true);
      renameMutation.mutate({ roadmapId: id, name });
    },
    [renameMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setMutating(true);
      removeMutation.mutate({ roadmapId: id });
    },
    [removeMutation],
  );

  const handleDescriptionBlur = useCallback(
    (description: string) => {
      if (!selectedRoadmap) return;
      if ((selectedRoadmap.description ?? "") === description) return;
      renameMutation.mutate({
        roadmapId: selectedRoadmap.id,
        name: selectedRoadmap.name,
        description,
      });
    },
    [selectedRoadmap, renameMutation],
  );

  const handleEntriesChange = useCallback(
    (newEntries: Entry[]) => {
      if (!selectedId) return;
      const key = { roadmapId: selectedId };
      utils.roadmaps.getMine.setData(key, (old) => {
        if (!old) return old;
        return {
          ...old,
          entries: newEntries.map((e, i) => ({
            id: `optimistic-${e.courseId}-${i}`,
            roadmapId: selectedId,
            courseId: e.courseId,
            yearNumber: e.yearNumber,
            term: e.term,
            sortOrder: i,
            course: {
              code: e.courseCode,
              name: e.courseName,
              creditUnits: e.creditUnits,
              description: e.description ?? "",
            },
          })),
        };
      });
    },
    [selectedId, utils],
  );

  const handleSave = useCallback(
    async (newEntries: Entry[]) => {
      if (!selectedId) return;
      const key = { roadmapId: selectedId };
      try {
        await saveEntriesWithConflictRetry(
          {
            roadmapId: selectedId,
            updatedAt: utils.roadmaps.getMine
              .getData(key)
              ?.roadmap.updatedAt?.toISOString(),
            entries: newEntries.map((e, i) => ({
              courseId: e.courseId,
              yearNumber: e.yearNumber,
              term: e.term as "T1" | "T2" | "T3A" | "T3B",
              sortOrder: i,
            })),
          },
          (next) => saveEntriesMutation.mutateAsync(next),
          async () => {
            await utils.roadmaps.getMine.invalidate(key);
            const fresh = await utils.roadmaps.getMine.fetch(key);
            return fresh?.roadmap.updatedAt?.toISOString();
          },
        );
      } catch (error) {
        // The retry also conflicted — a genuine cross-device edit. (Other
        // failures are already toasted by the mutation's onError.)
        if (isConflictError(error)) {
          toast.error(
            "This roadmap was updated elsewhere. Refresh and try again.",
          );
        }
        // Rethrow so RoadmapGrid keeps its dirty flag and retries on the
        // next edit / unmount flush.
        throw error;
      }
    },
    [selectedId, saveEntriesMutation, utils],
  );

  const handleAddCourse = useCallback(
    (course: {
      id: string;
      code: string;
      name: string;
      creditUnits: number;
    }) => {
      // A course may only be planned once — block adds that would duplicate
      // a course already placed elsewhere in the roadmap.
      if (findEntryByCourse(entries, course.id)) {
        toast.error(`${course.code} is already in your roadmap`);
        return;
      }
      const newEntry: Entry = {
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        creditUnits: course.creditUnits,
        yearNumber: 1,
        term: "T1",
      };
      const updated = [...entries, newEntry];
      handleEntriesChange(updated);
      void handleSave(updated);
    },
    [entries, handleEntriesChange, handleSave],
  );

  // ---- termFooter renderer for timetable links ----
  const termFooter = useCallback(
    (yearNumber: number, term: string) => {
      if (!acadTermsData || !findAcadTermForRoadmapTerm(term, acadTermsData)) {
        return null;
      }
      return (
        <TermTimetableLink
          yearNumber={yearNumber}
          term={term}
          acadTerms={acadTermsData}
        />
      );
    },
    [acadTermsData],
  );

  // ---- Loading state ----
  if (roadmapsLoading) {
    return (
      <div className="flex gap-4">
        <Skeleton className="h-[600px] w-52 shrink-0 rounded-lg" />
        <Skeleton className="h-[600px] flex-1 rounded-lg" />
      </div>
    );
  }

  // ---- Error state ----
  if (roadmapsError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground text-sm">
          {roadmapsErrorObj?.data?.code === "UNAUTHORIZED"
            ? "You must be logged in to view your roadmaps."
            : (roadmapsErrorObj?.message ??
              "Failed to load roadmaps. Please try again.")}
        </p>
      </div>
    );
  }

  // ---- Empty state (no roadmaps, none being created) ----
  const showEmptyState = roadmaps.length === 0;

  // ---- Render ----
  return (
    <div
      ref={layoutRef}
      className="flex flex-col gap-0 rounded-lg border lg:flex-row"
    >
      {/* Left sidebar: roadmap list (stacks on top on mobile) */}
      <RoadmapList
        roadmaps={roadmaps}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
        isMutating={mutating}
        className="max-h-60 w-full shrink-0 border-r-0 border-b lg:max-h-none lg:w-[var(--roadmap-list-width)] lg:border-b-0"
        style={
          {
            "--roadmap-list-width": `${panelWidths.list}px`,
          } as React.CSSProperties
        }
      />

      {/* Divider line sits on the handle's right edge (the list no longer
          draws its own border-r) so it meets the editor header's bottom
          border with no gap. */}
      <ResizeHandle
        label="Resize roadmap list"
        onDelta={handleListResize}
        className="border-r"
      />

      {/* Main area — flex column so the grid section fills the height below
          the header (the separator then spans the full column and meets the
          editor's bottom border even when the list is taller than the grid). */}
      <div className="flex min-w-0 flex-1 flex-col">
        {showEmptyState && (
          <EmptyState
            className="min-h-[400px]"
            icon={<GitBranch />}
            title="No roadmaps yet"
            description="Create your first roadmap to start planning your degree."
            action={
              <Button onClick={focusRoadmapCreateInput}>
                Create your first roadmap
              </Button>
            }
          />
        )}

        {/* Editor header: name + active/matric/sync + view toggle + share */}
        {!showEmptyState && selectedRoadmap && (
          <RoadmapEditorHeader
            selectedRoadmap={selectedRoadmap}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            isSettingActive={setActiveMutation.isPending}
            onSetActive={() =>
              setActiveMutation.mutate({ roadmapId: selectedRoadmap.id })
            }
            matricYearOptions={matricYearOptions}
            selectedMatricAy={selectedMatricAy}
            isMatricTermPending={setMatricTermMutation.isPending}
            onMatricTermChange={(matricTermId) =>
              setMatricTermMutation.mutate({
                roadmapId: selectedRoadmap.id,
                matricTermId,
              })
            }
            isSyncing={syncProgressMutation.isPending}
            onSyncProgress={() =>
              syncProgressMutation.mutate({ roadmapId: selectedRoadmap.id })
            }
            onDescriptionSave={handleDescriptionBlur}
            faculties={facultiesData ?? []}
            isFacultyPending={setFacultyMutation.isPending}
            onFacultyChange={(facultyId) =>
              setFacultyMutation.mutate({
                roadmapId: selectedRoadmap.id,
                facultyId,
              })
            }
          />
        )}

        {/* Entries loading */}
        {!showEmptyState && selectedId && entriesLoading && (
          <div className="p-4">
            <Skeleton className="mb-2 h-6 w-48" />
            <Skeleton className="h-[400px] w-full rounded-lg" />
          </div>
        )}

        {/* Entries error */}
        {!showEmptyState && selectedId && entriesError && (
          <div className="flex min-h-[400px] items-center justify-center">
            <p className="text-muted-foreground text-sm">
              {entriesErrorObj?.message ?? "Failed to load roadmap entries."}
            </p>
          </div>
        )}

        {/* Grid / Timeline (+ Search sidebar in grid mode) */}
        {!showEmptyState &&
          selectedId &&
          !entriesLoading &&
          !entriesError &&
          (viewMode === "timeline" ? (
            <div className="p-4">
              <LazyRoadmapTimeline entries={entries} readOnly />
            </div>
          ) : (
            <div
              className="min-h-0 flex-1 p-4"
              style={
                {
                  "--roadmap-sidebar-width": `${panelWidths.sidebar}px`,
                } as React.CSSProperties
              }
            >
              <RoadmapGrid
                roadmapId={selectedId}
                entries={entries}
                onEntriesChange={handleEntriesChange}
                onSave={handleSave}
                termFooter={termFooter}
                sidebar={
                  // -inset-y-4 / -right-4 bleed through p-4 so the handle's
                  // border-r at the panel's left edge meets the Courses
                  // header border-b with no gap, and the panel stretches to
                  // the outer editor border.
                  <div className="flex w-full shrink-0 flex-col border-t lg:absolute lg:-inset-y-4 lg:-right-4 lg:w-auto lg:flex-row lg:border-t-0">
                    <ResizeHandle
                      label="Resize courses panel"
                      onDelta={handleSidebarResize}
                      className="border-r"
                    />
                    <div className="min-h-0 w-full lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:w-[var(--roadmap-sidebar-width)]">
                      <CourseSearchSidebar onAddCourse={handleAddCourse} />
                    </div>
                  </div>
                }
              />
            </div>
          ))}
      </div>
    </div>
  );
}
