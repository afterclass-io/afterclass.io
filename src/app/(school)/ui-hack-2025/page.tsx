import {
  Code,
  Megaphone,
  Info,
  Inbox,
  ClipboardPenLine,
  Vote,
} from "lucide-react";

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
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";
import { cn } from "@/common/functions";
import { format } from "date-fns";
import { Heading } from "@/common/components/heading";

const TIMELINE_ITEMS = [
  {
    title: "Registration",
    // description: "14 Apr 2025, Monday",
    date: new Date(2025, 3, 14),
    dateFormat: "dd MMM yyyy, EEE",
    icon: <ClipboardPenLine />,
  },
  {
    title: "Information Session",
    // description: "12 May 2025, Monday 1pm",
    date: new Date(2025, 4, 12, 13),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Info />,
  },
  {
    title: "Phase 1 Begins",
    // description: "12 May 2025, Monday 2pm",
    date: new Date(2025, 4, 12, 14),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Code />,
  },
  {
    title: "Phase 1 Submission",
    // description: "14 May 2025, Wednesday 4pm",
    date: new Date(2025, 4, 14, 16),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Inbox />,
  },
  {
    title: "Voting Day",
    // description: "15 May 2025, Thursday 12pm",
    date: new Date(2025, 4, 15, 12),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Vote />,
  },
  {
    title: "Top 10 Announced",
    // description: "16 May 2025, Friday 12pm",
    date: new Date(2025, 4, 16, 12),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Megaphone />,
  },
  {
    title: "Phase 2 Begins",
    // description: "16 May 2025, Friday 12pm",
    date: new Date(2025, 4, 16, 12),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Code />,
  },
  {
    title: "Phase 2 Submission",
    // description: "18 May 2025, Sunday 4pm",
    date: new Date(2025, 4, 18, 16),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Inbox />,
  },
  {
    title: "Winners Announcement",
    // description: "20 May 2025, Tuesday 12pm",
    date: new Date(2025, 4, 20, 12),
    dateFormat: "dd MMM yyyy, EEE haaa",
    icon: <Megaphone />,
  },
];

export const TimelineWithIcon = () => {
  return (
    <Timeline>
      {TIMELINE_ITEMS.map((item, index) => {
        const now = new Date();
        const isPast = item.date < now;

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
              <TimelineTitle>{item.title}</TimelineTitle>
              <TimelineDescription className="font-mono">
                {format(item.date, item.dateFormat)}
              </TimelineDescription>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );
};

export default function Page() {
  return (
    <div className="space-y-4">
      <Heading
        as="h1"
        className="text-center text-3xl font-bold tracking-tight"
      >
        AfterClass UI Hack 2025
      </Heading>
      <FullWidthEnforcer />
      <Heading as="h2" className="text-xl font-bold tracking-tight">
        Timeline
      </Heading>
      <TimelineWithIcon />

      <Heading as="h2" className="text-xl font-bold tracking-tight">
        Submissions
      </Heading>
      <p className="text-muted-foreground">
        No submissions yet. Check back later!
      </p>
    </div>
  );
}
