"use client";

import { Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@/common/components/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { cn } from "@/common/functions";
import { getNameInitials } from "@/common/functions/format-user-display-name";

export type ParticipantItem = {
  participantId: string;
  name: string;
  availableSlots: number[];
  ifNeededSlots: number[];
  isCurrentUser: boolean;
};

export type MeetingParticipantListProps = {
  participants: ParticipantItem[];
  className?: string;
};

/** Compact roster: one chip per person, details in a tooltip. Groups are small (3 to 8). */
export function MeetingParticipantList({
  participants,
  className,
}: MeetingParticipantListProps) {
  return (
    <section
      className={cn("space-y-2", className)}
      data-test="meeting-participant-list"
    >
      <h2 className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <Users className="size-3.5" />
        {participants.length === 0
          ? "No one has joined yet"
          : `${participants.length} joined`}
      </h2>
      {participants.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {participants.map((p) => (
            <li
              key={p.participantId}
              data-test={`participant-item-${p.participantId}`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="bg-card inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5 text-xs">
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[9px] font-medium">
                        {getNameInitials(p.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-28 truncate font-medium">
                      {p.name}
                    </span>
                    {p.isCurrentUser && (
                      <span className="text-muted-foreground">(you)</span>
                    )}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="text-xs">
                  {p.name}: {p.availableSlots.length} available,{" "}
                  {p.ifNeededSlots.length} if needed
                </TooltipContent>
              </Tooltip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
