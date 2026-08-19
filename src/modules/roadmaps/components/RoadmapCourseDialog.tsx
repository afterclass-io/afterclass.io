"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/common/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/dialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapCourseInfo = {
  courseCode: string;
  courseName: string;
  creditUnits: number;
  /** Catalog description; absent/empty renders a fallback line */
  description?: string | null;
};

export type RoadmapCourseDialogProps = {
  /** Course to show, or null to close the dialog. */
  course: RoadmapCourseInfo | null;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Small read-only course details dialog shared by the roadmap editor grid
 * and the public/shared grid + timeline views. Links to the full course
 * review page at /course/[code].
 */
export function RoadmapCourseDialog({
  course,
  onClose,
}: RoadmapCourseDialogProps) {
  return (
    <Dialog
      open={!!course}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{course?.courseCode}</DialogTitle>
          <DialogDescription>{course?.courseName}</DialogDescription>
        </DialogHeader>

        <div className="text-sm">
          <span className="text-muted-foreground">Credit units: </span>
          <span className="font-medium tabular-nums">
            {course?.creditUnits ?? 0} CU
          </span>
        </div>

        <p className="text-muted-foreground max-h-48 overflow-y-auto text-sm whitespace-pre-wrap">
          {course?.description?.trim()
            ? course.description
            : "No description available."}
        </p>

        <DialogFooter>
          {course && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/course/${course.courseCode}`}>
                View course reviews
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
