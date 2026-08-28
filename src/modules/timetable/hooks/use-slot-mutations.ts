"use client";

import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { api } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { activeTimetableIdAtom } from "@/modules/timetable/atoms/timetable";
import { toArrangedClass } from "@/modules/timetable/functions/arranged-class";
import type { SlotWithClass } from "@/modules/timetable/functions/arranged-class";
import type { ArrangedClass } from "@/modules/timetable/components/TimetableGrid";

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
  /** Course context — lets the optimistic add render without a refetch. */
  courseCode: string;
  courseName: string;
  creditUnits: number;
};

export type SlotMutationOptions = {
  /**
   * The sections of the course being added/swapped — used to build the
   * optimistic arranged class. Optional so the history hook can reuse the
   * same mutations without knowing the course's sections (undo of an add
   * only carries `classId`); when absent the optimistic write is skipped
   * and the settle-invalidate refetch reconciles the cache.
   */
  sections?: SectionOption[];
  /** Course code for toast copy; generic copy when absent. */
  courseCode?: string;
  /** Called after a successful add/swap. */
  onDone?: () => void;
};

/**
 * Adapter from the flattened `searchCourses` section shape to the nested
 * `SlotWithClass` the shared `toArrangedClass` mapper expects, so the
 * optimistic slot is built by the same mapper as the server — the shape can
 * never drift between optimistic and refetched data.
 */
function toSlotWithClass(sec: SectionOption): SlotWithClass {
  return {
    class: {
      id: sec.classId,
      section: sec.section,
      course: {
        code: sec.courseCode,
        name: sec.courseName,
        creditUnits: sec.creditUnits,
      },
      professor: sec.professorName ? { name: sec.professorName } : null,
      classTimings: (sec.timings ?? []).map((t) => ({
        dayOfWeek: t.dayOfWeek ?? null,
        startTime: t.startTime,
        endTime: t.endTime,
        venue: t.venue ?? null,
      })),
      classExamTimings: (sec.examTimings ?? []).map((e) => ({
        date: e.date,
        // `searchCourses` does not select dayOfWeek for exam timings; the
        // exam view positions by date, so null is safe.
        dayOfWeek: null,
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue ?? null,
      })),
    },
  };
}

/**
 * Remove a class from the active timetable (grid X affordance).
 *
 * Optimistic: cancel in-flight arrangement fetch, snapshot the slots,
 * drop the slot from the cache immediately, restore on error, refetch on
 * settle — so the grid updates instantly instead of waiting a round-trip.
 * Shared so page.tsx and the undo/redo history hook use the same config.
 */
export function useRemoveSlotMutation() {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const utils = api.useUtils();

  return api.timetable.removeSlot.useMutation({
    ...createOptimisticMutationCallbacks<
      { timetableId: string; classId: string },
      ArrangedClass[] | undefined
    >({
      cancel: () =>
        utils.timetable.getArrangement.cancel({
          timetableId: activeTimetableId ?? "",
        }),
      getSnapshot: () =>
        activeTimetableId
          ? utils.timetable.getArrangement.getData({
              timetableId: activeTimetableId,
            })?.slots
          : undefined,
      applyOptimistic: ({ timetableId, classId }) =>
        utils.timetable.getArrangement.setData({ timetableId }, (old) =>
          old
            ? { ...old, slots: old.slots.filter((s) => s.classId !== classId) }
            : old,
        ),
      restoreSnapshot: (slots) => {
        if (slots && activeTimetableId) {
          utils.timetable.getArrangement.setData(
            { timetableId: activeTimetableId },
            (old) => (old ? { ...old, slots } : old),
          );
        }
      },
      invalidate: () =>
        utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId ?? "",
        }),
      onError: (message) => toast.error(`Failed to remove class: ${message}`),
    }),
    onSuccess: () => toast.success("Removed class from timetable"),
  });
}

/**
 * Add a class to the active timetable (course not yet present). Optimistic
 * wiring identical to removeSlot — the picked section is mapped through the
 * shared `toArrangedClass` so the optimistic slot matches the server shape.
 */
export function useAddSlotMutation({
  sections = [],
  courseCode,
  onDone,
}: SlotMutationOptions = {}) {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const utils = api.useUtils();

  return api.timetable.addSlot.useMutation({
    ...createOptimisticMutationCallbacks<
      { timetableId: string; classId: string },
      ArrangedClass[] | undefined
    >({
      cancel: () =>
        utils.timetable.getArrangement.cancel({
          timetableId: activeTimetableId ?? "",
        }),
      getSnapshot: () =>
        activeTimetableId
          ? utils.timetable.getArrangement.getData({
              timetableId: activeTimetableId,
            })?.slots
          : undefined,
      applyOptimistic: ({ timetableId, classId }) => {
        const picked = sections.find((s) => s.classId === classId);
        if (!picked) return;
        utils.timetable.getArrangement.setData({ timetableId }, (old) =>
          old
            ? {
                ...old,
                slots: [...old.slots, toArrangedClass(toSlotWithClass(picked))],
              }
            : old,
        );
      },
      restoreSnapshot: (slots) => {
        if (slots && activeTimetableId) {
          utils.timetable.getArrangement.setData(
            { timetableId: activeTimetableId },
            (old) => (old ? { ...old, slots } : old),
          );
        }
      },
      invalidate: () =>
        utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId ?? "",
        }),
      onError: () =>
        toast.error(
          courseCode
            ? `Failed to add ${courseCode}. Please try again.`
            : "Failed to add class. Please try again.",
        ),
    }),
    onSuccess: (data) => {
      if (data.created) {
        toast.success(
          courseCode
            ? `Added ${courseCode} to timetable`
            : "Added class to timetable",
        );
      } else {
        toast.info(
          courseCode
            ? `${courseCode} is already in your timetable`
            : "Class is already in your timetable",
        );
      }
      onDone?.();
    },
  });
}

/**
 * Swap a course to another section (course already present). Mirrors the
 * server: delete every slot of the course, then create the picked section.
 */
export function useSetSlotSectionMutation({
  sections = [],
  courseCode,
  onDone,
}: SlotMutationOptions = {}) {
  const activeTimetableId = useAtomValue(activeTimetableIdAtom);
  const utils = api.useUtils();

  return api.timetable.setSlotSection.useMutation({
    ...createOptimisticMutationCallbacks<
      { timetableId: string; courseId: string; classId: string },
      ArrangedClass[] | undefined
    >({
      cancel: () =>
        utils.timetable.getArrangement.cancel({
          timetableId: activeTimetableId ?? "",
        }),
      getSnapshot: () =>
        activeTimetableId
          ? utils.timetable.getArrangement.getData({
              timetableId: activeTimetableId,
            })?.slots
          : undefined,
      applyOptimistic: ({ timetableId, classId }) => {
        const picked = sections.find((s) => s.classId === classId);
        if (!picked) return;
        utils.timetable.getArrangement.setData({ timetableId }, (old) =>
          old
            ? {
                ...old,
                slots: [
                  // The server deletes every slot of the course, then
                  // creates the picked section — mirror that here.
                  ...old.slots.filter(
                    (s) => s.courseCode !== picked.courseCode,
                  ),
                  toArrangedClass(toSlotWithClass(picked)),
                ],
              }
            : old,
        );
      },
      restoreSnapshot: (slots) => {
        if (slots && activeTimetableId) {
          utils.timetable.getArrangement.setData(
            { timetableId: activeTimetableId },
            (old) => (old ? { ...old, slots } : old),
          );
        }
      },
      invalidate: () =>
        utils.timetable.getArrangement.invalidate({
          timetableId: activeTimetableId ?? "",
        }),
      onError: () => toast.error("Failed to swap section. Please try again."),
    }),
    onSuccess: () => {
      toast.success(
        courseCode ? `Swapped section for ${courseCode}` : "Swapped section",
      );
      onDone?.();
    },
  });
}
