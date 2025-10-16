import {
  ClockIcon,
  GraduationCapColoredIcon,
  MemoIcon,
  PinIcon,
} from "@/common/components/icons";
import {
  type Courses,
  type ClassExamTiming,
  type ClassTiming,
  type Professors,
} from "@prisma/client";
import { Tag } from "@/common/components/tag";
import React from "react";
import { Heading } from "@/common/components/heading";
import { ProgressLink } from "@/common/components/progress-link";

export const ClassCard = ({
  course,
  section,
  classId,
  classTiming,
  examTiming,
  professor,
}: {
  course: Partial<Courses>;
  section: string;
  classId: string;
  classTiming: Pick<
    ClassTiming,
    "dayOfWeek" | "startTime" | "endTime" | "venue"
  >[];
  examTiming: Partial<ClassExamTiming>[];
  professor: Partial<Professors> | null;
}) => {
  const hasFullExamTiming =
    examTiming.length > 0 &&
    examTiming.every(
      (timing) =>
        timing.date && timing.dayOfWeek && timing.startTime && timing.endTime,
    );
  return (
    <ProgressLink
      variant="outline"
      className="hover:bg-secondary focus-ring bg-card flex h-fit w-64 cursor-pointer flex-col items-start gap-2 rounded-md border p-4 text-left font-normal md:gap-4"
      href={`/bidding/analytics?course=${course.code}&section=${section}&classId=${classId}`}
      data-umami-event="boss-bid-class-select"
      data-umami-event-class-id={classId}
      data-umami-event-prof-slug={professor?.slug}
    >
      <div className="flex w-full flex-col items-start gap-1">
        <div className="flex items-center gap-2">
          <Heading className="text-primary text-xl tracking-tight">
            {course.code}
          </Heading>
          <Tag variant="soft" color="primary" size="sm" deletable={false}>
            {section}
          </Tag>
        </div>
        <Heading className="w-full truncate font-bold tracking-tight">
          {course.name}
        </Heading>

        <div className="flex items-center gap-2">
          <GraduationCapColoredIcon size={24} />
          <span className="w-full truncate tracking-tight">
            {professor?.name ?? "TBA"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {classTiming.length > 0 ? (
          classTiming.map((timing, index) => (
            <div key={index}>
              <div className="flex items-center gap-1">
                <ClockIcon size={16} className="mr-1" />
                <span className="max-w-16 truncate text-sm">
                  {timing.dayOfWeek}
                </span>
                <span className="text-sm">
                  {timing.startTime}-{timing.endTime}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PinIcon size={16} className="mr-1" />
                <span className="text-muted-foreground text-xs">
                  {timing.venue ?? "TBA"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-1">
            <ClockIcon size={16} className="mr-1" />
            <div className="text-sm">No class timings available</div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {hasFullExamTiming ? (
          examTiming.map((timing, index) => (
            <div key={index}>
              <div className="flex items-center gap-1">
                <MemoIcon size={16} className="mr-1" />
                <span className="text-sm">
                  {timing.date
                    ? new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                      .format(timing.date)
                      .replace(/ /g, "-")
                    : ""}
                  ,
                </span>
                <span className="max-w-16 truncate text-sm">
                  {timing.dayOfWeek}
                </span>
                <span className="text-sm">
                  {timing.startTime}-{timing.endTime}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <PinIcon size={16} className="mr-1" />
                <span className="text-muted-foreground text-xs">
                  {timing.venue ?? "TBA"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-1">
            <MemoIcon size={16} className="mr-1" />
            <div className="text-sm">No exam timings available</div>
          </div>
        )}
      </div>
    </ProgressLink>
  );
};
