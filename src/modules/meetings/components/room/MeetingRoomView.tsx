"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useSession } from "next-auth/react";
import { useAtom } from "jotai";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import { api, type RouterOutputs } from "@/common/tools/trpc/react";
import { meetingsRoomTourSteps } from "@/common/tour/steps";
import { useAutoStartTour } from "@/common/tour/useAutoStartTour";
import {
  hasSeenMeetingsTourAtom,
  meetingBrushModeAtom,
  meetingHideIfNeededAtom,
  meetingVisibleOverlaysAtom,
} from "@/modules/meetings/atoms/meetings";
import { MeetingMatrixGrid } from "@/modules/meetings/components/grid/MeetingMatrixGrid";
import {
  MeetingDetailsPanel,
  type MeetingDetails,
} from "@/modules/meetings/components/room/MeetingDetailsPanel";
import { MeetingRoomHeader } from "@/modules/meetings/components/room/MeetingRoomHeader";
import { MeetingEditPanel } from "@/modules/meetings/components/room/MeetingEditPanel";
import { MeetingGroupPanel } from "@/modules/meetings/components/room/MeetingGroupPanel";
import { SelectedRangeBar } from "@/modules/meetings/components/room/SelectedRangeBar";
import { findBestSlot, findTopSlots } from "@/modules/meetings/functions/best-slot";
import {
  slotRangeToInstants,
  summarizeRangeAvailability,
} from "@/modules/meetings/functions/slot-range";
import type { SlotRange } from "@/modules/meetings/functions/slot-runs";
import { useAvailabilityEditor } from "@/modules/meetings/hooks/useAvailabilityEditor";
import { useMeetingOverlays } from "@/modules/meetings/hooks/useMeetingOverlays";
import {
  getTotalSlots,
  slotIndexToDateTime,
} from "@/modules/meetings/utils/matrix";

type PollData = RouterOutputs["meetings"]["getPollBySlug"];

function MeetingRoom({ data, slug }: { data: PollData; slug: string }) {
  const { poll, participants, heatmap } = data;
  const { data: session } = useSession();

  const [isEditing, setIsEditing] = useState(false);
  const [brushMode, setBrushMode] = useAtom(meetingBrushModeAtom);
  const [hideIfNeeded, setHideIfNeeded] = useAtom(meetingHideIfNeededAtom);
  const [visibleSources, setVisibleSources] = useAtom(meetingVisibleOverlaysAtom);
  const [selectedRange, setSelectedRange] = useState<SlotRange | null>(null);

  const utils = api.useUtils();
  const isSignedIn = Boolean(session?.user);

  const [hasSeenTour, setHasSeenTour] = useAtom(hasSeenMeetingsTourAtom);
  useAutoStartTour(meetingsRoomTourSteps, {
    hasSeen: hasSeenTour,
    onDone: useCallback(() => setHasSeenTour(true), [setHasSeenTour]),
  });

  // Opening a shared link adds the meeting to the signed-in viewer's list.
  const { mutate: joinPoll } = api.meetings.joinPoll.useMutation({
    onSuccess: async () => {
      await utils.meetings.getPollBySlug.invalidate({ slug });
      await utils.meetings.listMyMeetings.invalidate();
    },
    onError: (err) => toast.error(err.message || "Could not join this meeting"),
  });
  const hasJoined = participants.some((p) => p.isCurrentUser);
  useEffect(() => {
    if (isSignedIn && !hasJoined) joinPoll({ slug });
  }, [isSignedIn, hasJoined, joinPoll, slug]);

  const updateDetails = api.meetings.updatePoll.useMutation({
    onSuccess: async () => {
      toast.success("Meeting details updated");
      await utils.meetings.getPollBySlug.invalidate({ slug });
    },
    onError: (err) => toast.error(err.message || "Failed to update details"),
  });
  const handleSaveDetails = (details: MeetingDetails) =>
    updateDetails.mutate({ slug, ...details });

  const currentUser = participants.find((p) => p.isCurrentUser);
  const totalSlots = useMemo(
    () =>
      getTotalSlots(
        poll.startDate,
        poll.endDate,
        poll.startHour,
        poll.endHour,
        poll.slotDurationMinutes,
      ),
    [poll],
  );

  const editor = useAvailabilityEditor({
    slug,
    totalSlots,
    savedAvailable: currentUser?.availableSlots,
    savedIfNeeded: currentUser?.ifNeededSlots,
    isSignedIn,
    onSaved: () => setIsEditing(false),
  });
  const { overlays, timetable, google } = useMeetingOverlays({
    startDate: poll.startDate,
    endDate: poll.endDate,
    startHour: poll.startHour,
    endHour: poll.endHour,
    slotMinutes: poll.slotDurationMinutes,
    acadTermId: poll.acadTerm?.id,
    enabled: isSignedIn,
  });

  const pollWindow = {
    startDate: poll.startDate,
    startHour: poll.startHour,
    endHour: poll.endHour,
    slotMinutes: poll.slotDurationMinutes,
  };

  const topTimes = useMemo(() => {
    const top = findTopSlots(heatmap, totalSlots, 3);
    return top.map((slot) => {
      const { date, timeStr } = slotIndexToDateTime(
        slot.slotIndex,
        poll.startDate,
        poll.startHour,
        poll.endHour,
        poll.slotDurationMinutes,
      );
      const day = formatDateSGT(date, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      return {
        rank: slot.rank,
        slotIndex: slot.slotIndex,
        label: `${day} ${timeStr} (${slot.availableCount}/${participants.length})`,
        onSelect: () =>
          setSelectedRange({ start: slot.slotIndex, end: slot.slotIndex }),
      };
    });
  }, [heatmap, totalSlots, poll, participants.length]);

  const bestTime = useMemo(() => {
    const best = findBestSlot(heatmap, totalSlots);
    if (!best) return null;
    const { date, timeStr } = slotIndexToDateTime(
      best.slotIndex,
      poll.startDate,
      poll.startHour,
      poll.endHour,
      poll.slotDurationMinutes,
    );
    const day = formatDateSGT(date, { weekday: "short", day: "numeric", month: "short" });
    return {
      label: `${day} ${timeStr} (${best.availableCount}/${participants.length})`,
      onSelect: () => setSelectedRange({ start: best.slotIndex, end: best.slotIndex }),
    };
  }, [heatmap, totalSlots, poll, participants.length]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Meeting link copied");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleAutofillTimetable = () => {
    if (!session) {
      toast.error("Please sign in to autofill from your timetable");
      return;
    }
    if (timetable.isLoading) {
      toast.info("Loading your timetable. Try again in a moment.");
      return;
    }
    if (!timetable.hasTimetable) {
      toast.error(
        `No active timetable found${poll.acadTerm ? ` for this meeting's term` : ""}. Add classes in Timetable first.`,
      );
      return;
    }
    editor.autofillAround(timetable.blockedSlots);
    toast.success(
      timetable.blockedSlots.size === 0
        ? "None of your classes fall in this meeting's dates, so everything is marked free"
        : "Filled in the slots around your classes",
    );
  };

  const handleAutofillGoogle = () => {
    if (!google.isConnected) {
      void google.syncCalendar();
      return;
    }
    editor.autofillAround(google.blockedSlots);
    toast.success("Filled in the slots around your Google Calendar events");
  };

  const handleClear = () => {
    editor.clear();
    toast.info("Cleared your availability. Save to keep the change.");
  };

  const handleStartEditing = () => {
    if (!isSignedIn) {
      toast.error("Please sign in to add your availability");
      return;
    }
    setSelectedRange(null);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    editor.discard();
    setIsEditing(false);
  };

  const shownOverlays = overlays.filter(
    (overlay) => visibleSources[overlay.source],
  );

  const rangeSummary = !isEditing && selectedRange && {
    ...slotRangeToInstants(selectedRange, pollWindow),
    ...summarizeRangeAvailability(participants, selectedRange),
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Google Identity Services, used by the Google Calendar sync. */}
      {isSignedIn && (
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      )}
      <MeetingRoomHeader
        title={poll.title}
        description={poll.description}
        course={poll.course}
        section={poll.section}
        teamIdentifier={poll.teamIdentifier}
        acadTermId={poll.acadTerm?.id}
        canEditDetails={poll.isCreator}
        isSavingDetails={updateDetails.isPending}
        onSaveDescription={(description) =>
          updateDetails.mutate({ slug, description })
        }
        isEditing={isEditing}
        hasUnsavedChanges={editor.hasUnsavedChanges}
        isSaving={editor.isSaving}
        onCopyLink={handleCopyLink}
        onEdit={handleStartEditing}
        onCancel={handleCancelEditing}
        onSave={editor.save}
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <MeetingMatrixGrid
            startDate={poll.startDate}
            endDate={poll.endDate}
            startHour={poll.startHour}
            endHour={poll.endHour}
            slotMinutes={poll.slotDurationMinutes}
            viewMode={isEditing ? "paint" : "heatmap"}
            availableSlots={editor.availableSlots}
            ifNeededSlots={editor.ifNeededSlots}
            onAvailabilityChange={editor.setPainted}
            brushMode={brushMode}
            overlays={isEditing ? shownOverlays : undefined}
            participants={participants}
            hideIfNeeded={hideIfNeeded}
            selectedRange={selectedRange}
            onSelectRange={setSelectedRange}
          />

          {rangeSummary && (
            <div className="sticky bottom-3 z-30">
              <SelectedRangeBar
                title={poll.title}
                description={poll.agenda ?? poll.description}
                start={rangeSummary.start}
                end={rangeSummary.end}
                free={rangeSummary.free}
                maybe={rangeSummary.maybe}
                total={rangeSummary.total}
                onClear={() => setSelectedRange(null)}
              />
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {isEditing && (
            <MeetingEditPanel
              brushMode={brushMode}
              onBrushModeChange={setBrushMode}
              visibleSources={visibleSources}
              onVisibleSourceChange={(source, visible) =>
                setVisibleSources((current) => ({ ...current, [source]: visible }))
              }
              hasTimetable={timetable.hasTimetable}
              isTimetableLoading={timetable.isLoading}
              isGoogleConnected={google.isConnected}
              isGoogleSyncing={google.isSyncing}
              onConnectGoogle={() => void google.syncCalendar()}
              onAutofillTimetable={handleAutofillTimetable}
              onAutofillGoogle={handleAutofillGoogle}
              onClear={handleClear}
            />
          )}
          <MeetingDetailsPanel
            agenda={poll.agenda}
            links={poll.links}
            canEdit={poll.isCreator}
            isSaving={updateDetails.isPending}
            onSave={handleSaveDetails}
          />
          {!isEditing && (
            <MeetingGroupPanel
              participants={participants}
              hideIfNeeded={hideIfNeeded}
              onHideIfNeededChange={setHideIfNeeded}
              bestTime={bestTime}
              topTimes={topTimes}
            />
          )}
        </aside>
      </div>

      {isEditing && editor.hasUnsavedChanges && (
        <div className="bg-background/95 animate-in fade-in slide-in-from-bottom-2 fixed inset-x-4 bottom-4 z-40 flex items-center justify-between gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md sm:hidden">
          <span className="text-xs font-medium">Unsaved availability</span>
          <Button
            size="sm"
            onClick={editor.save}
            disabled={editor.isSaving}
            className="h-8 gap-1.5 text-xs"
          >
            {editor.isSaving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}

export type MeetingRoomViewProps = {
  slug: string;
};

export function MeetingRoomView({ slug }: MeetingRoomViewProps) {
  const { data, isLoading, error } = api.meetings.getPollBySlug.useQuery(
    { slug },
    { staleTime: 10_000, refetchOnWindowFocus: true },
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <EmptyState
          title="Meeting not found"
          description="This meeting link may be invalid or the meeting was removed."
          action={
            <Button asChild>
              <Link href="/meetings">Back to Meetings</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return <MeetingRoom data={data} slug={slug} />;
}
