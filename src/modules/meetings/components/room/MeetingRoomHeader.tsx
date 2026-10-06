"use client";

import { Check, Copy, Loader2, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/common/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/common/components/dropdown-menu";
import { PageTitle } from "@/common/components/page-title";
import { meetingsRoomTourSteps } from "@/common/tour/steps";
import { TourReplayButton } from "@/common/tour/TourReplayButton";
import { MeetingDescription } from "@/modules/meetings/components/room/MeetingDescription";
import { CourseBacktrackMenuItem } from "@/modules/meetings/components/room/CourseBacktrackMenuItem";
import { MeetingMetaTags } from "@/modules/meetings/components/shared/MeetingMetaTags";

export type MeetingRoomHeaderProps = {
  title: string;
  description: string | null;
  course: { id: string; code: string } | null;
  section: string | null;
  teamIdentifier: string | null;
  acadTermId?: string;
  canEditDetails: boolean;
  isSavingDetails: boolean;
  onSaveDescription: (description: string | null) => void;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
};

/** Title, one meta line and the room's actions. Everything else lives in the grid. */
export function MeetingRoomHeader({
  title,
  description,
  course,
  section,
  teamIdentifier,
  acadTermId,
  canEditDetails,
  isSavingDetails,
  onSaveDescription,
  isEditing,
  hasUnsavedChanges,
  isSaving,
  onCopyLink,
  onEdit,
  onCancel,
  onSave,
}: MeetingRoomHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <PageTitle className="text-left text-2xl font-bold tracking-tight break-words md:text-2xl!">
            {title}
          </PageTitle>
        </div>
        <MeetingDescription
          description={description}
          canEdit={canEditDetails}
          isSaving={isSavingDetails}
          onSave={onSaveDescription}
        />
        <MeetingMetaTags
          course={course}
          section={section}
          teamIdentifier={teamIdentifier}
          className="text-muted-foreground"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <TourReplayButton steps={meetingsRoomTourSteps} />

        <Button
          variant="outline"
          size="sm"
          onClick={onCopyLink}
          className="gap-1.5"
          data-test="meeting-copy-link"
        >
          <Copy className="size-3.5" />
          Copy link
        </Button>

        {course && section && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                aria-label="More actions"
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <CourseBacktrackMenuItem
                courseId={course.id}
                courseCode={course.code}
                section={section}
                acadTermId={acadTermId}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving || !hasUnsavedChanges}
              className="gap-1.5"
              data-test="save-availability-button"
            >
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Save
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            onClick={onEdit}
            className="gap-1.5"
            data-test="meeting-edit-availability"
          >
            <Pencil className="size-3.5" />
            Edit availability
          </Button>
        )}
      </div>
    </div>
  );
}
