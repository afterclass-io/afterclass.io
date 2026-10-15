"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";

import { Button, buttonVariants } from "@/common/components/button";
import { cn } from "@/common/functions";
import { Card, CardContent } from "@/common/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/alert-dialog";
import { MeetingMetaTags } from "@/modules/meetings/components/shared/MeetingMetaTags";
import {
  formatMeetingSummary,
  type MeetingSummaryInput,
} from "@/modules/meetings/functions/format-meeting";

type MeetingCardItem = MeetingSummaryInput & {
  slug: string;
  title: string;
  description?: string | null;
  course?: { code: string } | null;
  section?: string | null;
  teamIdentifier?: string | null;
  isCreator?: boolean;
};

export type MeetingCardProps = {
  meeting: MeetingCardItem;
  onDelete?: () => void;
  isDeleting?: boolean;
};

/** Compact meeting summary; the whole card is one link to the room. */
export function MeetingCard({
  meeting,
  onDelete,
  isDeleting = false,
}: MeetingCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const title = (
    <Link
      href={`/meetings/${meeting.slug}`}
      className="after:absolute after:inset-0 focus-visible:outline-hidden"
    >
      {meeting.title}
    </Link>
  );

  return (
    <>
      <Card
        data-test={`meeting-card-${meeting.slug}`}
        className="has-[a:focus-visible]:ring-ring/50 relative gap-0 py-4 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-[3px]"
      >
        <CardContent className="flex flex-col gap-1.5 px-4">
          <div className="flex min-h-5 items-center justify-between gap-2">
            <MeetingMetaTags
              course={meeting.course}
              section={meeting.section}
              teamIdentifier={meeting.teamIdentifier}
            />
            {meeting.isCreator && onDelete && (
              <div className="relative z-10 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 size-7"
                  aria-label="Delete meeting"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  data-test={`delete-meeting-button-${meeting.slug}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
          <h3 className="truncate text-base leading-snug font-semibold">
            {meeting.description ? (
              <Tooltip>
                <TooltipTrigger asChild>{title}</TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {meeting.description}
                </TooltipContent>
              </Tooltip>
            ) : (
              title
            )}
          </h3>
          <p className="text-muted-foreground truncate text-xs">
            {formatMeetingSummary(meeting)}
          </p>
        </CardContent>
      </Card>

      {meeting.isCreator && onDelete && (
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete meeting?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{meeting.title}&rdquo;?
                This will permanently remove the poll and all submitted
                availability.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={cn(buttonVariants({ variant: "destructive" }))}
                disabled={isDeleting}
                onClick={onDelete}
                data-test="confirm-delete-meeting-button"
              >
                {isDeleting ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 size-3.5" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
