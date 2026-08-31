"use client";

import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { toast } from "sonner";
import { Plus, ArrowLeftRight } from "lucide-react";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { pushHistoryAtom } from "@/modules/timetable/atoms/history";
import {
  useAddSlotMutation,
  useSetSlotSectionMutation,
} from "@/modules/timetable/hooks/use-slot-mutations";
import type {
  SectionExamTiming,
  SectionOption,
  SectionTiming,
} from "@/modules/timetable/hooks/use-slot-mutations";
import { Button } from "@/common/components/button";
import { cn } from "@/common/functions";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import { abbreviateVenue } from "@/modules/timetable/functions/abbreviate-venue";
import { hasTimeConflict, toTimingLikes } from "@/modules/timetable/functions/slot-math";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

const EMPTY_ARRAY: never[] = [];

/** Re-exported so callers can keep importing `SectionOption` from here. */
export type { SectionOption } from "@/modules/timetable/hooks/use-slot-mutations";

export type SectionPickerProps = {
  /** The course these sections belong to. */
  courseId: string;
  courseCode: string;
  /** Whether this course is already present in the active timetable. */
  alreadyInTimetable: boolean;
  /** The sections available for this course. */
  sections: SectionOption[];
  /** Classes currently on the active timetable's grid (for clash checks). */
  existingSlots?: ArrangedClass[];
  /** Called after a successful add/swap. */
  onDone?: () => void;
  className?: string;
};

function formatTimingLine(t: SectionTiming): string {
  const day = t.dayOfWeek ?? "?";
  return `🕐 ${day} ${t.startTime}–${t.endTime}`;
}

function formatExamLine(t: SectionExamTiming): string {
  const dateLabel = formatDateSGT(t.date, { day: "numeric", month: "short" });
  return `📝 Exam ${dateLabel} ${t.startTime}–${t.endTime}`;
}

const lineClasses = "text-muted-foreground text-xs break-words tabular-nums";

/**
 * Displays all sections for a course with an "Add to timetable" or
 * "Swap section" button per section.
 *
 * - If the course is NOT yet in the timetable → `addSlot` mutation
 * - If the course IS already in the timetable → `setSlotSection` mutation
 *
 * Both mutations invalidate on success; errors surface via sonner toast.
 */
export function SectionPicker({
  courseId,
  courseCode,
  alreadyInTimetable,
  sections,
  existingSlots = EMPTY_ARRAY,
  onDone,
  className,
}: SectionPickerProps) {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const pushHistory = useSetAtom(pushHistoryAtom);

  // Shared optimistic mutation hooks — the same configs the undo/redo
  // history hook executes, so history and the UI can never drift.
  const addSlotMutation = useAddSlotMutation({ sections, courseCode, onDone });
  const setSlotSectionMutation = useSetSlotSectionMutation({
    sections,
    courseCode,
    onDone,
  });

  const handleAdd = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      const picked = sections.find((s) => s.classId === classId);
      if (picked) {
        // Block free adds that clash with a class already on the grid.
        const conflictCheckSlots = existingSlots.map((s) => ({
          classTimings: toTimingLikes(s.timings),
        }));
        const candidate = {
          classTimings: toTimingLikes(picked.timings ?? []),
        };
        if (hasTimeConflict(conflictCheckSlots, candidate)) {
          toast.error(
            `Time conflict with an existing class — ${courseCode} ${picked.section} was not added`,
          );
          return;
        }
      }
      addSlotMutation.mutate({ timetableId: activeTimetableId, classId });
      // Record for undo/redo — the inverse (removeSlot) runs through the
      // same shared mutation config.
      pushHistory({
        type: "addSlot",
        timetableId: activeTimetableId,
        classId,
      });
    },
    [activeTimetableId, addSlotMutation, sections, existingSlots, courseCode, pushHistory],
  );

  const handleSwap = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      setSlotSectionMutation.mutate({
        timetableId: activeTimetableId,
        courseId,
        classId,
      });
      // Record the swap for undo/redo: from the section currently on the
      // grid to the newly picked one. `existingSlots` is the active
      // timetable's grid, so the current classId is authoritative.
      const currentClassId = existingSlots.find((s) => s.courseCode === courseCode)?.classId;
      if (currentClassId) {
        pushHistory({
          type: "setSlotSection",
          timetableId: activeTimetableId,
          courseId,
          fromClassId: currentClassId,
          toClassId: classId,
        });
      }
    },
    [activeTimetableId, courseId, setSlotSectionMutation, existingSlots, courseCode, pushHistory],
  );

  if (sections.length === 0) {
    return (
      <p className={cn("text-muted-foreground py-4 text-center text-sm", className)}>
        No sections available for this course.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Sections
      </p>
      {sections.map((sec) => (
        <div
          key={sec.classId}
          className="border-border bg-card flex items-center justify-between gap-3 rounded-md border px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-sm font-medium">Section {sec.section}</span>
              <span className="text-muted-foreground text-xs">👤 {sec.professorName ?? "TBA"}</span>
            </div>
            {sec.timings && sec.timings.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {sec.timings.map((t, i) => (
                  <div key={i}>
                    <p className={lineClasses}>{formatTimingLine(t)}</p>
                    {t.venue && <p className={lineClasses}>📍 {abbreviateVenue(t.venue)}</p>}
                  </div>
                ))}
              </div>
            )}
            {sec.examTimings?.map((t, i) => (
              <div key={i}>
                <p className={lineClasses}>{formatExamLine(t)}</p>
                {t.venue && <p className={lineClasses}>📍 {abbreviateVenue(t.venue)}</p>}
              </div>
            ))}
          </div>
          <Button
            variant={alreadyInTimetable ? "outline" : "default"}
            size="sm"
            className="shrink-0"
            disabled={addSlotMutation.isPending || setSlotSectionMutation.isPending}
            data-test={`timetable-section-action-${sec.classId}`}
            onClick={() => (alreadyInTimetable ? handleSwap(sec.classId) : handleAdd(sec.classId))}
          >
            {alreadyInTimetable ? (
              <>
                <ArrowLeftRight className="size-3.5" />
                Swap
              </>
            ) : (
              <>
                <Plus className="size-3.5" />
                Add
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
