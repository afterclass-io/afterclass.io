"use client";

import Link from "next/link";

import { Card, CardContent } from "@/common/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { MeetingMetaTags } from "@/modules/meetings/components/shared/MeetingMetaTags";
import {
  formatMeetingSummary,
  type MeetingSummaryInput,
} from "@/modules/meetings/functions/format-meeting";

export type MeetingCardItem = MeetingSummaryInput & {
  slug: string;
  title: string;
  description?: string | null;
  course?: { code: string } | null;
  section?: string | null;
  teamIdentifier?: string | null;
};

export type MeetingCardProps = {
  meeting: MeetingCardItem;
};

/** Compact meeting summary; the whole card is one link to the room. */
export function MeetingCard({ meeting }: MeetingCardProps) {
  const title = (
    <Link
      href={`/meetings/${meeting.slug}`}
      className="after:absolute after:inset-0 focus-visible:outline-hidden"
    >
      {meeting.title}
    </Link>
  );

  return (
    <Card
      data-test={`meeting-card-${meeting.slug}`}
      className="has-[a:focus-visible]:ring-ring/50 relative gap-0 py-4 transition-shadow hover:shadow-md has-[a:focus-visible]:ring-[3px]"
    >
      <CardContent className="flex flex-col gap-1.5 px-4">
        <div className="min-h-5 flex items-center">
          <MeetingMetaTags
            course={meeting.course}
            section={meeting.section}
            teamIdentifier={meeting.teamIdentifier}
          />
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
  );
}
