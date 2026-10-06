"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Calendar, Plus, Users } from "lucide-react";

import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import { PageTitle } from "@/common/components/page-title";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { api } from "@/common/tools/trpc/react";
import { MeetingCard } from "@/modules/meetings/components/dashboard/MeetingCard";
import { groupMeetingsByStatus } from "@/modules/meetings/functions/poll-status";

const CARD_GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

export function MeetingsDashboardView() {
  const { data: session, status: sessionStatus } = useSession();

  const {
    data: meetings,
    isLoading,
    error,
  } = api.meetings.listMyMeetings.useQuery(undefined, {
    enabled: Boolean(session?.user),
    staleTime: 30_000,
  });

  const { upcoming, past } = useMemo(
    () => groupMeetingsByStatus(meetings ?? []),
    [meetings],
  );

  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
            Meetings
          </PageTitle>
          <p className="text-muted-foreground text-sm">
            Find a time that works for your whole group.
          </p>
        </div>

        <Button asChild className="shrink-0 gap-2">
          <Link href="/meetings/new" data-test="new-meeting-button">
            <Plus className="size-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      {sessionStatus !== "loading" && !session && (
        <EmptyState
          icon={<Users className="size-8" />}
          title="Sign in to view your meetings"
          description="Sign in with your university account to coordinate meeting schedules and view polls you've created or joined."
          action={
            <Button asChild>
              <Link href={`/account/auth/login?callbackUrl=${encodeURIComponent("/meetings")}`}>
                Sign In
              </Link>
            </Button>
          }
        />
      )}

      {session && isLoading && (
        <div className={CARD_GRID}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-card/50 border-border h-28 animate-pulse rounded-xl border"
            />
          ))}
        </div>
      )}

      {session && error && (
        <EmptyState
          title="Failed to load meetings"
          description={error.message || "An unexpected error occurred while loading your meetings."}
        />
      )}

      {session && !isLoading && !error && meetings?.length === 0 && (
        <EmptyState
          icon={<Calendar className="size-8" />}
          title="No meetings yet"
          description="You haven't scheduled or joined any meetings. Create a poll to find the best time with your group."
          action={
            <Button asChild className="gap-2">
              <Link href="/meetings/new">
                <Plus className="size-4" />
                Schedule First Meeting
              </Link>
            </Button>
          }
        />
      )}

      {session && meetings && meetings.length > 0 && (
        <>
          <ToggleGroup
            type="single"
            value={tab}
            onValueChange={(value) => {
              if (value) setTab(value as "upcoming" | "past");
            }}
            variant="segmented"
            size="sm"
            className="self-start"
            data-test="meetings-tabs"
          >
            <ToggleGroupItem value="upcoming">
              Upcoming ({upcoming.length})
            </ToggleGroupItem>
            <ToggleGroupItem value="past">Past ({past.length})</ToggleGroupItem>
          </ToggleGroup>

          <section data-test={`meetings-${tab}`}>
            {visible.length > 0 ? (
              <div className={CARD_GRID}>
                {visible.map((meeting) => (
                  <MeetingCard key={meeting.id} meeting={meeting} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {tab === "upcoming"
                  ? "Nothing coming up. Create a poll to schedule your next meeting."
                  : "No past meetings yet."}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
