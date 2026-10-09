"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type RouterOutputs } from "@/common/tools/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
import { CourseSectionPicker, type SearchCourse } from "./CourseSectionPicker";
import { BidDialogForm } from "./BidDialogForm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserBidRow = RouterOutputs["userBids"]["listMine"][number];

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
    if (!initialCourseCode || selectedCourse?.id !== "") return;
    const match = resolveCourseQuery.data?.find(
      (c) => c.code === initialCourseCode,
    );
    // Query data hydrates the placeholder after the dialog has mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync resolved course into dialog state
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

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  // ---- Derived ----
  const pickerVisible = mode !== "class";

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

        <BidDialogForm
          mode={mode}
          bid={bid}
          acadTermId={acadTermId}
          defaultWindowId={defaultWindowId}
          isOpen={isOpen}
          onClose={onClose}
          selectedClassId={selectedClassId}
          classInfo={{
            courseCode: courseCodeLabel,
            courseName: courseNameLabel,
            section: sectionLabel,
            professorName,
            creditUnits,
            timings,
            examTimings,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
