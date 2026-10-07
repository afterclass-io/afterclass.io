"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DropdownMenuItem } from "@/common/components/dropdown-menu";
import { api } from "@/common/tools/trpc/react";

export type CourseBacktrackMenuItemProps = {
  courseId: string;
  courseCode: string;
  section: string;
  acadTermId?: string;
};

/**
 * Menu item that adds the meeting's class to the viewer's active timetable
 * (and, through the timetable, their roadmap). Shows a confirmed state once the
 * class is already there. Renders nothing for signed-out viewers.
 */
export function CourseBacktrackMenuItem({
  courseId,
  courseCode,
  section,
  acadTermId,
}: CourseBacktrackMenuItemProps) {
  const { data: session } = useSession();
  const utils = api.useUtils();
  const [justAdded, setJustAdded] = useState(false);
  const isLoggedIn = Boolean(session?.user);

  const { data: timetableDetail, isLoading: isTimetableLoading } =
    api.timetable.getMyTimetableDetail.useQuery(
      { acadTermId },
      { enabled: isLoggedIn },
    );
  const { data: classes, isLoading: isClassesLoading } =
    api.classes.getAllByCourseId.useQuery(
      { courseId, acadTermId },
      { enabled: isLoggedIn },
    );

  const addSlotMutation = api.timetable.addSlot.useMutation({
    onSuccess: () => {
      setJustAdded(true);
      toast.success(`Added ${courseCode} (${section}) to your active timetable`);
      void utils.timetable.getMyTimetableDetail.invalidate();
      void utils.timetable.getArrangement.invalidate();
      void utils.timetable.listMine.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add class to your timetable");
    },
  });

  if (!isLoggedIn) return null;

  const isEnrolled =
    justAdded ||
    Boolean(
      timetableDetail?.slots?.some(
        (slot) =>
          (slot.courseId === courseId || slot.courseCode === courseCode) &&
          slot.section === section,
      ),
    );

  const handleAdd = () => {
    if (!timetableDetail?.timetableId) {
      toast.error("No active timetable found for this term. Please create one first.");
      return;
    }
    const targetClass = classes?.find((c) => c.section === section);
    if (!targetClass) {
      toast.error(`Section ${section} of ${courseCode} was not found in this term.`);
      return;
    }
    addSlotMutation.mutate({
      timetableId: timetableDetail.timetableId,
      classId: targetClass.id,
    });
  };

  if (isEnrolled) {
    return (
      <DropdownMenuItem disabled data-test="in-active-timetable-badge">
        <Check />
        {courseCode} is in your timetable
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem
      onSelect={handleAdd}
      disabled={addSlotMutation.isPending || isTimetableLoading || isClassesLoading}
      data-test="add-to-timetable-button"
    >
      {addSlotMutation.isPending ? <Loader2 className="animate-spin" /> : <GraduationCap />}
      Add {courseCode} to timetable &amp; roadmap
    </DropdownMenuItem>
  );
}
