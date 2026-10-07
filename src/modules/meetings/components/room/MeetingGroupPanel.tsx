"use client";

import { useId } from "react";
import { Sparkles } from "lucide-react";

import { Button } from "@/common/components/button";
import { Checkbox } from "@/common/components/checkbox";
import {
  MeetingParticipantList,
  type ParticipantItem,
} from "@/modules/meetings/components/room/MeetingParticipantList";

export type TopTimeItem = {
  rank: number;
  slotIndex: number;
  label: string;
  onSelect: () => void;
};

export type MeetingGroupPanelProps = {
  participants: ParticipantItem[];
  hideIfNeeded: boolean;
  onHideIfNeededChange: (hide: boolean) => void;
  bestTime?: { label: string; onSelect: () => void } | null;
  topTimes?: TopTimeItem[];
};

/** Group view sidebar: who joined, availability legend, and top timeslots optimizer. */
export function MeetingGroupPanel({
  participants,
  hideIfNeeded,
  onHideIfNeededChange,
  bestTime,
  topTimes,
}: MeetingGroupPanelProps) {
  const hideIfNeededId = useId();

  return (
    <div className="space-y-4" data-test="meeting-group-panel">
      <MeetingParticipantList participants={participants} />

      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <span>Fewer free</span>
          <span className="h-2 flex-1 rounded-full bg-gradient-to-r from-(--mt-available)/15 to-(--mt-available)" />
          <span>More free</span>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={hideIfNeededId}
            checked={hideIfNeeded}
            onCheckedChange={(checked) => onHideIfNeededChange(Boolean(checked))}
            data-test="heatmap-hide-if-needed-checkbox"
          />
          <label
            htmlFor={hideIfNeededId}
            className="cursor-pointer text-sm select-none"
          >
            Hide &ldquo;if needed&rdquo;
          </label>
        </div>

        {topTimes && topTimes.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            <p className="text-muted-foreground text-xs font-medium">Top timeslots:</p>
            <div className="space-y-1">
              {topTimes.map((time) => (
                <Button
                  key={time.slotIndex}
                  variant="outline"
                  size="sm"
                  onClick={time.onSelect}
                  className="h-auto w-full justify-between gap-1.5 py-1.5 text-xs text-left whitespace-normal"
                  data-test={`meeting-top-time-${time.rank}`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="text-primary size-3.5 shrink-0" />
                    <span className="truncate">{time.label}</span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-[11px] font-mono">
                    #{time.rank}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        ) : bestTime ? (
          <Button
            variant="outline"
            size="sm"
            onClick={bestTime.onSelect}
            className="h-auto w-full justify-start gap-1.5 py-1.5 text-left whitespace-normal"
            data-test="meeting-best-time"
          >
            <Sparkles className="text-primary size-3.5 shrink-0" />
            Best: {bestTime.label}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
