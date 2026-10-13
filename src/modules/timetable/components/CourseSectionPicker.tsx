"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { api, type RouterOutputs } from "@/common/tools/trpc/react";
import { Label } from "@/common/components/label";
import { Input } from "@/common/components/input";
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
import { useDebouncedValue } from "@/common/hooks/useDebouncedValue";

export type SearchCourse = RouterOutputs["timetable"]["searchCourses"][number];

/**
 * Two grid cells: a course search (term-scoped via `timetable.searchCourses`)
 * and a section select fed by the chosen course. Rendered as a fragment so
 * the cells participate in the parent's grid.
 */
export function CourseSectionPicker({
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
                {searchQuery.isPending && (
                  <p className="text-muted-foreground p-2 text-xs">
                    Searching…
                  </p>
                )}
                {!searchQuery.isPending && courses.length === 0 && (
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
