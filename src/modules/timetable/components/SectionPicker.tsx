"use client";

import { useCallback } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Plus, ArrowLeftRight } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { Button } from "@/common/components/button";
import { cn } from "@/common/functions";

/** Timing shape returned per section from `searchCourses`. */
export type SectionTiming = {
  dayOfWeek?: string | null;
  startTime: string;
  endTime: string;
  venue?: string | null;
};

/** Exam timing shape returned per section from `searchCourses`. */
export type SectionExamTiming = {
  date: Date | string;
  startTime: string;
  endTime: string;
  venue?: string | null;
};

/** Shape of a section returned from `searchCourses`. */
export type SectionOption = {
  classId: string;
  section: string;
  professorName?: string | null;
  timings?: SectionTiming[];
  examTimings?: SectionExamTiming[];
};

export type SectionPickerProps = {
  /** The course these sections belong to. */
  courseId: string;
  courseCode: string;
  /** Whether this course is already present in the active timetable. */
  alreadyInTimetable: boolean;
  /** The sections available for this course. */
  sections: SectionOption[];
  /** Called after a successful add/swap. */
  onDone?: () => void;
  className?: string;
};

function formatTimingLine(t: SectionTiming): string {
  const day = t.dayOfWeek ?? "?";
  return `${day} ${t.startTime}–${t.endTime}${t.venue ? ` · ${t.venue}` : ""}`;
}

function formatExamLine(t: SectionExamTiming): string {
  const date = typeof t.date === "string" ? new Date(t.date) : t.date;
  const dateLabel = date.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Singapore",
  });
  return `Exam ${dateLabel} ${t.startTime}–${t.endTime}${t.venue ? ` · ${t.venue}` : ""}`;
}

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
  onDone,
  className,
}: SectionPickerProps) {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const utils = api.useUtils();

  const addSlotMutation = api.timetable.addSlot.useMutation({
    onSuccess: () => {
      void utils.timetable.getArrangement.invalidate({
        timetableId: activeTimetableId!,
      });
      toast.success(`Added ${courseCode} to timetable`);
      onDone?.();
    },
    onError: () => {
      toast.error(`Failed to add ${courseCode}. Please try again.`);
    },
  });

  const setSlotSectionMutation = api.timetable.setSlotSection.useMutation({
    onSuccess: () => {
      void utils.timetable.getArrangement.invalidate({
        timetableId: activeTimetableId!,
      });
      toast.success(`Swapped section for ${courseCode}`);
      onDone?.();
    },
    onError: () => {
      toast.error("Failed to swap section. Please try again.");
    },
  });

  const handleAdd = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      addSlotMutation.mutate({ timetableId: activeTimetableId, classId });
    },
    [activeTimetableId, addSlotMutation],
  );

  const handleSwap = useCallback(
    (classId: string) => {
      if (!activeTimetableId) return;
      setSlotSectionMutation.mutate({
        timetableId: activeTimetableId,
        courseId,
        classId,
      });
    },
    [activeTimetableId, courseId, setSlotSectionMutation],
  );

  if (sections.length === 0) {
    return (
      <p
        className={cn(
          "text-muted-foreground py-4 text-center text-sm",
          className,
        )}
      >
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
              <span className="text-muted-foreground text-xs">
                {sec.professorName ?? "TBA"}
              </span>
            </div>
            {sec.timings && sec.timings.length > 0 && (
              <div className="mt-0.5 space-y-0.5">
                {sec.timings.map((t, i) => (
                  <p
                    key={i}
                    className="text-muted-foreground text-xs break-words tabular-nums"
                  >
                    {formatTimingLine(t)}
                  </p>
                ))}
              </div>
            )}
            {sec.examTimings?.map((t, i) => (
              <p
                key={i}
                className="text-muted-foreground text-xs break-words tabular-nums"
              >
                {formatExamLine(t)}
              </p>
            ))}
          </div>
          <Button
            variant={alreadyInTimetable ? "outline" : "default"}
            size="sm"
            className="shrink-0"
            disabled={
              addSlotMutation.isPending || setSlotSectionMutation.isPending
            }
            data-test={`timetable-section-action-${sec.classId}`}
            onClick={() =>
              alreadyInTimetable
                ? handleSwap(sec.classId)
                : handleAdd(sec.classId)
            }
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
