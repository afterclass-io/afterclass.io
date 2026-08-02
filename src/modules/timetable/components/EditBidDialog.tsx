"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import type { RouterOutputs } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";
import { Input } from "@/common/components/input";
import { Label } from "@/common/components/label";
import { Textarea } from "@/common/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";
import { bidAmountSchema } from "@/modules/timetable/functions/bid-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BidRow = RouterOutputs["userBids"]["listMine"][number];

type SearchCourse = RouterOutputs["timetable"]["searchCourses"][number];

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
// Full-edit dialog
// ---------------------------------------------------------------------------

/**
 * Shared bid dialog, used both to add a new bid and to edit an existing one:
 * course/section, round and window (scoped to the term via
 * `timetable.getBidWindows`), bid amount, and notes.
 *
 * - Edit mode (`bid` given): every field prefilled from the bid; the caller
 *   saves through `userBids.update`.
 * - Add mode (`bid: null`): empty defaults, with the round/window preselected
 *   to `defaultWindowId` (the current/upcoming window) once windows load;
 *   the caller saves through `userBids.upsert`.
 */
export function EditBidDialog({
  bid,
  acadTermId,
  defaultWindowId,
  isSaving,
  onSubmit,
  onClose,
}: {
  /** The bid being edited, or null when adding a new bid. */
  bid: BidRow | null;
  acadTermId: string;
  /** Window preselected in add mode (current/upcoming); ignored when editing. */
  defaultWindowId: number | null;
  isSaving: boolean;
  onSubmit: (values: {
    classId: string;
    bidWindowId: number;
    bidAmount: number;
    notes: string | null;
  }) => void;
  onClose: () => void;
}) {
  // Course/section — in edit mode prefilled with the bid's current course
  // (placeholder carrying just the current section); the full section list is
  // swapped in once the term-scoped search by course code resolves.
  const [selectedCourse, setSelectedCourse] = useState<SearchCourse | null>(
    () =>
      bid
        ? {
            id: "",
            code: bid.courseCode,
            name: bid.courseName,
            creditUnits: 0,
            sections: [
              {
                classId: bid.classId,
                section: bid.section,
                professorName: bid.professorName,
                timings: [],
                examTimings: [],
              },
            ],
          }
        : null,
  );
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    bid?.classId ?? null,
  );

  const courseFetchQuery = api.timetable.searchCourses.useQuery(
    { acadTermId, query: bid?.courseCode ?? "" },
    { enabled: !!bid, staleTime: 60_000 },
  );

  useEffect(() => {
    // Only replace the placeholder (id === ""), never a user choice.
    if (!bid || !selectedCourse || selectedCourse.id !== "") return;
    const match = courseFetchQuery.data?.find((c) => c.code === bid.courseCode);
    if (match) setSelectedCourse(match);
  }, [courseFetchQuery.data, selectedCourse, bid]);

  // Round/window pickers scoped to the term.
  const windowsQuery = api.timetable.getBidWindows.useQuery({ acadTermId });
  const windows = useMemo(() => windowsQuery.data ?? [], [windowsQuery.data]);

  const [round, setRound] = useState(bid?.bidWindow.round ?? "");
  const [windowNum, setWindowNum] = useState(
    bid ? String(bid.bidWindow.window) : "",
  );

  // Add mode: preselect the current/upcoming window once windows load.
  useEffect(() => {
    if (bid || round || windows.length === 0) return;
    const fallback =
      windows.find((w) => w.id === defaultWindowId) ?? windows[0];
    if (!fallback) return;
    setRound(fallback.round);
    setWindowNum(String(fallback.window));
  }, [bid, round, windows, defaultWindowId]);

  const roundOptions = useMemo(() => {
    const rounds = new Set(windows.map((w) => w.round));
    if (bid) rounds.add(bid.bidWindow.round);
    return [...rounds];
  }, [windows, bid]);

  const windowOptions = useMemo(() => {
    const nums = windows.filter((w) => w.round === round).map((w) => w.window);
    if (
      bid &&
      round === bid.bidWindow.round &&
      !nums.includes(bid.bidWindow.window)
    ) {
      nums.push(bid.bidWindow.window);
    }
    return nums.sort((a, b) => a - b);
  }, [windows, round, bid]);

  const [amountRaw, setAmountRaw] = useState(bid ? String(bid.bidAmount) : "");
  const [notes, setNotes] = useState(bid?.notes ?? "");

  const handleSave = () => {
    if (!selectedClassId) {
      toast.error("Pick a course and section first");
      return;
    }
    const win = windows.find(
      (w) => w.round === round && w.window === Number(windowNum),
    );
    const bidWindowId = win
      ? win.id
      : bid &&
          round === bid.bidWindow.round &&
          Number(windowNum) === bid.bidWindow.window
        ? bid.bidWindowId
        : undefined;
    if (!bidWindowId) {
      toast.error("Pick a bid window");
      return;
    }
    const parsed = bidAmountSchema.safeParse(Number(amountRaw.trim()));
    if (!parsed.success) {
      toast.error("Enter a valid bid amount (1–99,999)");
      return;
    }
    onSubmit({
      classId: selectedClassId,
      bidWindowId,
      bidAmount: parsed.data,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-test="edit-bid-dialog">
        <DialogHeader>
          <DialogTitle>
            {bid ? `Edit bid — ${bid.courseCode} ${bid.section}` : "Add a bid"}
          </DialogTitle>
          <DialogDescription>
            {bid
              ? "Change the course or section, move the bid to another round or window, or update the amount and notes."
              : "Pick a course and section, choose a round and window, and set your bid amount."}
          </DialogDescription>
        </DialogHeader>

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

          {/* Round */}
          <div className="space-y-1.5">
            <Label>Round</Label>
            <Select
              value={round}
              onValueChange={(r) => {
                setRound(r);
                const first = windows
                  .filter((w) => w.round === r)
                  .map((w) => w.window)
                  .sort((a, b) => a - b)[0];
                setWindowNum(first !== undefined ? String(first) : "");
              }}
              disabled={windowsQuery.isLoading}
            >
              <SelectTrigger size="sm" aria-label="Select round">
                <SelectValue placeholder="Round" />
              </SelectTrigger>
              <SelectContent>
                {roundOptions.map((r) => (
                  <SelectItem key={r} value={r}>
                    Round {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Window */}
          <div className="space-y-1.5">
            <Label>Window</Label>
            <Select
              value={windowNum}
              onValueChange={setWindowNum}
              disabled={windowsQuery.isLoading}
            >
              <SelectTrigger size="sm" aria-label="Select window">
                <SelectValue placeholder="Window" />
              </SelectTrigger>
              <SelectContent>
                {windowOptions.map((w) => (
                  <SelectItem key={w} value={String(w)}>
                    Window {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-bid-amount">Bid amount (e$)</Label>
            <Input
              id="edit-bid-amount"
              type="text"
              inputMode="numeric"
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="edit-bid-notes">Notes (optional)</Label>
            <Textarea
              id="edit-bid-notes"
              maxLength={500}
              placeholder="e.g. must-have for my major"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-16 resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            {bid ? "Save changes" : "Save bid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
