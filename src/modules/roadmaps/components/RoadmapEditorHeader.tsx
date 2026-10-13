"use client";

import {
  GitBranch,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
  Star,
} from "lucide-react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { DescriptionEditor } from "@/modules/roadmaps/components/DescriptionEditor";
import { ShareDialog } from "@/modules/sharing/components/ShareDialog";
import { Button } from "@/common/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { TourReplayButton } from "@/common/tour/TourReplayButton";
import { roadmapsTourSteps } from "@/common/tour/steps";
import { cn } from "@/common/functions";

export type EditorViewMode = "grid" | "timeline";

/** Sentinel Select value for the "Clear" matriculation-year item. */
const CLEAR_MATRIC_VALUE = "__clear__";

type EditorRoadmap = Pick<
  RouterOutputs["roadmaps"]["listMine"][number],
  | "id"
  | "name"
  | "description"
  | "visibility"
  | "shareToken"
  | "facultyId"
  | "isActive"
  | "matricTermId"
>;

/**
 * Header of the roadmap editor: name, active toggle, matriculation year and
 * progress sync (active roadmap only), view toggle, share, and the
 * description and faculty row.
 */
export function RoadmapEditorHeader({
  selectedRoadmap,
  viewMode,
  onViewModeChange,
  isSettingActive,
  onSetActive,
  matricYearOptions,
  selectedMatricAy,
  isMatricTermPending,
  onMatricTermChange,
  isSyncing,
  onSyncProgress,
  onDescriptionSave,
  faculties,
  isFacultyPending,
  onFacultyChange,
}: {
  selectedRoadmap: EditorRoadmap;
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  isSettingActive: boolean;
  onSetActive: () => void;
  matricYearOptions: { ay: string; termId: string }[];
  selectedMatricAy: string | undefined;
  isMatricTermPending: boolean;
  /** Pass null to clear the declaration. */
  onMatricTermChange: (matricTermId: string | null) => void;
  isSyncing: boolean;
  onSyncProgress: () => void;
  onDescriptionSave: (description: string) => void;
  faculties: { id: number; name: string; acronym: string }[];
  isFacultyPending: boolean;
  onFacultyChange: (facultyId: number) => void;
}) {
  return (
    <div className="border-b">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="min-w-0 truncate text-sm font-semibold">
            {selectedRoadmap.name}
          </h2>
          {/* Active roadmap toggle (one active roadmap per user) */}
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Disabled buttons don't fire pointer events, so the
                  tooltip anchors to this wrapper instead. */}
              <span className="inline-flex">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={
                    selectedRoadmap.isActive
                      ? "Active roadmap"
                      : "Mark as active roadmap"
                  }
                  disabled={selectedRoadmap.isActive || isSettingActive}
                  onClick={onSetActive}
                  data-test="roadmap-active-toggle"
                >
                  <Star
                    className={cn(
                      "size-4",
                      selectedRoadmap.isActive
                        ? "fill-primary text-primary"
                        : "text-muted-foreground",
                    )}
                  />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {selectedRoadmap.isActive
                ? "Active roadmap — syncs with your timetables across terms"
                : "Mark as active to sync this roadmap with your timetables across terms"}
            </TooltipContent>
          </Tooltip>
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {selectedRoadmap.isActive
              ? "Active — syncs timetable"
              : "Set active"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedRoadmap.isActive && (
            <>
              {/* Matriculation year (which AY was Y1; starts in T1) */}
              <Select
                value={selectedMatricAy}
                onValueChange={(ay) => {
                  // The "Clear" item resets the declaration (the server
                  // procedure accepts null to clear).
                  if (ay === CLEAR_MATRIC_VALUE) {
                    onMatricTermChange(null);
                    return;
                  }
                  const option = matricYearOptions.find((o) => o.ay === ay);
                  if (!option) return;
                  onMatricTermChange(option.termId);
                }}
                disabled={isMatricTermPending}
              >
                <SelectTrigger
                  className="w-36"
                  aria-label="Matriculation year"
                  data-test="matric-term-select"
                >
                  <SelectValue placeholder="Matriculation year…" />
                </SelectTrigger>
                <SelectContent>
                  {matricYearOptions.map((o) => (
                    <SelectItem key={o.ay} value={o.ay}>
                      {o.ay}
                    </SelectItem>
                  ))}
                  <SelectItem
                    value={CLEAR_MATRIC_VALUE}
                    data-test="matric-term-clear"
                  >
                    Clear
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Explicit progress sync */}
              <Button
                variant="outline"
                size="sm"
                disabled={!selectedRoadmap.matricTermId || isSyncing}
                onClick={onSyncProgress}
                data-test="sync-progress-button"
              >
                <RefreshCw
                  className={cn("size-4", isSyncing && "animate-spin")}
                />
                <span className="hidden sm:inline">Sync progress</span>
              </Button>
            </>
          )}

          <ToggleGroup
            type="single"
            variant="segmented"
            size="sm"
            value={viewMode}
            onValueChange={(v) => v && onViewModeChange(v as EditorViewMode)}
            data-test="roadmap-view-toggle"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Grid view"
              className="justify-center px-3"
            >
              <LayoutGrid className="size-4 shrink-0" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem
              value="timeline"
              aria-label="Timeline view"
              className="justify-center px-3"
            >
              <GitBranch className="size-4 shrink-0" />
              <span className="hidden sm:inline">Timeline</span>
            </ToggleGroupItem>
          </ToggleGroup>
          <ShareDialog
            entity="roadmap"
            entityId={selectedRoadmap.id}
            entityName={selectedRoadmap.name}
            visibility={selectedRoadmap.visibility ?? "PRIVATE"}
            shareToken={selectedRoadmap.shareToken ?? null}
          />
          <TourReplayButton steps={roadmapsTourSteps} />
        </div>
      </div>

      {/* Secondary row: description + faculty declaration (per-roadmap) */}
      <div className="flex flex-wrap items-start gap-3 px-4 pb-2">
        <DescriptionEditor
          key={selectedRoadmap.id}
          initialValue={selectedRoadmap.description ?? ""}
          onSave={onDescriptionSave}
        />
        <div className="flex items-center gap-2">
          <GraduationCap className="text-muted-foreground size-4 shrink-0" />
          <Select
            key={selectedRoadmap.id}
            value={
              selectedRoadmap.facultyId != null
                ? String(selectedRoadmap.facultyId)
                : undefined
            }
            onValueChange={(v) => onFacultyChange(Number(v))}
            disabled={isFacultyPending}
          >
            <SelectTrigger
              className="w-56"
              aria-label="Your faculty"
              data-test="faculty-select"
            >
              <SelectValue placeholder="Declare your faculty…" />
            </SelectTrigger>
            <SelectContent>
              {faculties.map((f) => (
                <SelectItem key={f.id} value={String(f.id)}>
                  {f.name} ({f.acronym})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
