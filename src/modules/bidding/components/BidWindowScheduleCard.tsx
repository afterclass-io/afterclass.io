import { connection } from "next/server";
import { format } from "date-fns";
import { TZDate, tz } from "@date-fns/tz";
import { Edit, Lock, ScreenShare } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
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

// Singapore time zone constant
const sgTz = tz("Asia/Singapore");

const TIMELINE_ITEMS = [
  {
    title: "Window 2 Opens",
    date: new TZDate(2025, 6, 11, 17, 0, 0, "Asia/Singapore"),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Edit />,
  },
  {
    title: "Window 2 Closes",
    date: new TZDate(2025, 6, 14, 10, 0, 0, "Asia/Singapore"),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Lock />,
  },
  {
    title: "Window 2 Results Released",
    date: new TZDate(2025, 6, 14, 14, 0, 0, "Asia/Singapore"),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <ScreenShare />,
  },
];

const TimelineWithIcon = ({ now }: { now: Date }) => {
  return (
    <Timeline>
      {TIMELINE_ITEMS.map((item, index) => {
        const isPast = item.date < now;
        const nextItem = TIMELINE_ITEMS.at(index + 1);
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
              {index < TIMELINE_ITEMS.length - 1 && (
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
                {format(item.date, item.dateFormat, { in: sgTz })}
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

  const acadTermId = (await api.acadTerms.getLatest())!.id;
  const { term, displayYear } = inferAcadTerm(acadTermId);

  return (
    <Card className="w-full max-w-[321px]">
      <CardHeader className="gap-2">
        <CardTitle>
          BOSS {displayYear} Term {term} Round 1A
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TimelineWithIcon now={now} />
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
