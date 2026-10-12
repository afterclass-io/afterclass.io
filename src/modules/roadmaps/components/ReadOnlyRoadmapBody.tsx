import Link from "next/link";
import { ArrowLeft, GitBranch, LayoutGrid } from "lucide-react";
import { Button } from "@/common/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { RoadmapGrid } from "@/modules/roadmaps/components/RoadmapGrid";
import { LazyRoadmapTimeline } from "@/modules/roadmaps/components/LazyRoadmapTimeline";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";

// Shared by the public roadmap page and the share-link roadmap page.
// Keep this module free of hooks so server pages can import toRoadmapEntries.

export type RoadmapViewMode = "grid" | "timeline";

/** One entry as returned by roadmaps.getById and sharing.getSharedRoadmap. */
type RoadmapPayloadEntry = {
  courseId: string;
  yearNumber: number;
  term: string;
  course: {
    code: string;
    name: string;
    creditUnits: number;
    description?: string | null;
  };
};

export function toRoadmapEntries(entries: RoadmapPayloadEntry[]): Entry[] {
  return entries.map((e) => ({
    courseId: e.courseId,
    courseCode: e.course.code,
    courseName: e.course.name,
    creditUnits: e.course.creditUnits,
    description: e.course.description,
    yearNumber: e.yearNumber,
    term: e.term,
  }));
}

/** Stable no-op: the read-only grid never changes its entries. */
const noop = () => {
  /* read-only — no-op */
};

export type ReadOnlyRoadmapBodyProps = {
  roadmapId: string;
  entries: Entry[];
  viewMode: RoadmapViewMode;
};

export function ReadOnlyRoadmapBody({
  roadmapId,
  entries,
  viewMode,
}: ReadOnlyRoadmapBodyProps) {
  return viewMode === "grid" ? (
    <RoadmapGrid
      roadmapId={roadmapId}
      entries={entries}
      readOnly
      onEntriesChange={noop}
    />
  ) : (
    <LazyRoadmapTimeline entries={entries} readOnly />
  );
}

export type RoadmapViewModeToggleProps = {
  value: RoadmapViewMode;
  onValueChange: (mode: RoadmapViewMode) => void;
};

export function RoadmapViewModeToggle({
  value,
  onValueChange,
}: RoadmapViewModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as RoadmapViewMode)}
      variant="segmented"
      size="sm"
    >
      <ToggleGroupItem value="grid" aria-label="Grid View">
        <LayoutGrid className="size-4 shrink-0" />
        <span className="hidden sm:inline">Grid</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="timeline" aria-label="Timeline View">
        <GitBranch className="size-4 shrink-0" />
        <span className="hidden sm:inline">Timeline</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function RoadmapsBackLink() {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
        <Link href="/roadmaps">
          <ArrowLeft className="size-4" />
          All roadmaps
        </Link>
      </Button>
    </div>
  );
}
