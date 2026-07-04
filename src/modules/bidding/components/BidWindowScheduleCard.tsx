import { connection } from "next/server";
import { TZDate } from "@date-fns/tz";
import { Edit, Lock, ScreenShare } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/card";
import { Tag } from "@/common/components/tag";
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDescription,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/common/components/timeline";
import { cn } from "@/common/functions";
import { api } from "@/common/tools/trpc/server";
import { inferAcadTerm } from "@/common/functions";
import { ProgressLink } from "@/common/components/progress-link";
import { Button } from "@/common/components/button";

interface TimelineItemData {
  title: string;
  date: Date;
  dateFormat: string;
  icon: React.ReactNode;
}

const EVENT_ICONS = {
  opens: <Edit />,
  closes: <Lock />,
  results: <ScreenShare />,
} as const;

const EVENT_DATE_FORMAT = "dd MMM yyyy, EEE haaa";

/** Format a Date in Singapore Time (SGT, UTC+8) using Intl.DateTimeFormat */
function formatSgt(date: Date, formatStr: string): string {
  if (formatStr === EVENT_DATE_FORMAT) {
    // "dd MMM yyyy, EEE haaa" → e.g. "06 Jul 2026, Mon 5PM"
    const parts = new Intl.DateTimeFormat("en-SG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Singapore",
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const month = get("month");
    const day = get("day");
    const year = get("year");
    const weekday = get("weekday");
    let hour = parseInt(get("hour"));
    const minute = get("minute");
    const dayPeriod = get("dayPeriod").toUpperCase();

    // Convert 12-hour to 1-12 without leading zero
    if (hour === 0) hour = 12;

    const timeStr = minute === "00"
      ? `${hour}${dayPeriod}`
      : `${hour}:${minute}${dayPeriod}`;

    return `${day} ${month} ${year}, ${weekday} ${timeStr}`;
  }
  // Fallback: use Intl.DateTimeFormat directly
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "full",
    timeStyle: "full",
    timeZone: "Asia/Singapore",
  }).format(date);
}

/**
 * Build 3 timeline events for a single bidding window from stored
 * opensAt, closesAt, and resultsAt dates.
 */
function buildTimelineItems(bw: {
  opensAt: Date | null;
  closesAt: Date | null;
  resultsAt: Date | null;
}): TimelineItemData[] {
  const items: (TimelineItemData | null)[] = [
    bw.opensAt
      ? {
          title: "Opens",
          date: bw.opensAt,
          dateFormat: EVENT_DATE_FORMAT,
          icon: EVENT_ICONS.opens,
        }
      : null,
    bw.closesAt
      ? {
          title: "Closes",
          date: bw.closesAt,
          dateFormat: EVENT_DATE_FORMAT,
          icon: EVENT_ICONS.closes,
        }
      : null,
    bw.resultsAt
      ? {
          title: "Results Released",
          date: bw.resultsAt,
          dateFormat: EVENT_DATE_FORMAT,
          icon: EVENT_ICONS.results,
        }
      : null,
  ];
  return items.filter((item): item is TimelineItemData => item !== null);
}

const TimelineWithIcon = ({
  items,
  now,
}: {
  items: TimelineItemData[];
  now: Date;
}) => {
  if (items.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-4 text-center">
        No upcoming bidding windows scheduled.
      </div>
    );
  }

  return (
    <Timeline>
      {items.map((item, index) => {
        const isPast = item.date < now;
        const nextItem = items.at(index + 1);
        const msIn2Hours = 2 * 60 * 60 * 1000;
        const timeUntil = item.date.getTime() - now.getTime();

        let tagLabel: string | null = null;

        if (item.date > now && timeUntil <= msIn2Hours) {
          if (item.title.toLowerCase().includes("opens"))
            tagLabel = "Opening Soon";
          else if (item.title.toLowerCase().includes("closes"))
            tagLabel = "Closing Soon";
          else if (item.title.toLowerCase().includes("released"))
            tagLabel = "Releasing Soon";
        }

        if (
          item.title.toLowerCase().includes("opens") &&
          now >= item.date &&
          nextItem &&
          now < nextItem.date
        ) {
          tagLabel = "Ongoing";
        }

        return (
          <TimelineItem key={index}>
            <TimelineSeparator>
              <TimelineDot>{item.icon}</TimelineDot>
              {index < items.length - 1 && (
                <TimelineConnector
                  className={cn(isPast && "bg-accent-foreground")}
                />
              )}
            </TimelineSeparator>
            <TimelineContent>
              <TimelineTitle className="flex max-w-[230px] flex-wrap gap-1">
                {item.title}
                {tagLabel && (
                  <Tag
                    variant="soft"
                    color={
                      tagLabel.toLowerCase() === "ongoing"
                        ? "success"
                        : "warning"
                    }
                    size="xs"
                    deletable={false}
                  >
                    {tagLabel}
                  </Tag>
                )}
              </TimelineTitle>
              <TimelineDescription className="font-mono">
                {formatSgt(item.date, item.dateFormat)}
              </TimelineDescription>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
};

export const BidWindowScheduleCard = async () => {
  await connection();
  const now = new TZDate(Date.now(), "Asia/Singapore");

  const currentWindow = await api.bidWindows.getCurrentWindow();

  if (!currentWindow) {
    return (
      <Card className="w-full max-w-[321px]">
        <CardContent className="py-4 text-muted-foreground text-sm text-center">
          No bidding window schedule available.
        </CardContent>
      </Card>
    );
  }

  const { term, displayYear } = inferAcadTerm(currentWindow.acadTermId);

  const titleRound = currentWindow.round;
  const timelineItems = buildTimelineItems(currentWindow);

  return (
    <Card className="w-full max-w-[321px]">
      <CardHeader className="gap-2">
        <CardTitle>BOSS {displayYear} Term {term}</CardTitle>
        <CardDescription>
          Round {titleRound} Window {currentWindow.window}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TimelineWithIcon items={timelineItems} now={now} />
        <div className="text-muted-foreground text-wrap">
          <span>For more detailed schedules, refer to</span>
          <Button asChild variant="link" className="inline px-1 py-0">
            <a
              href="https://smu.sharepoint.com/sites/oasis/Documents/Downloads/RO/UGRD.pdf"
              target="_blank"
              rel="noopener noreferrer"
              data-umami-event="boss-bid-date"
            >
              BOSS Bidding Dates
            </a>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="text-muted-foreground text-wrap">
        <div>
          Struggling with bid amounts? Try out our
          <ProgressLink
            href="/bidding"
            variant="link"
            className="inline px-1 py-0"
            data-umami-event="boss-bid-recommendation"
          >
            bid recommendations
          </ProgressLink>
          and secure your modules!
        </div>
      </CardFooter>
    </Card>
  );
};
