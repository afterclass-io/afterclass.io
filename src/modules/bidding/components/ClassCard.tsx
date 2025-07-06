import {
  CheckIcon,
  ClockIcon,
  GraduationCapColoredIcon,
  MemoIcon,
  PinIcon,
  SearchIcon,
} from "@/common/components/icons";
import { Button } from "@/common/components/button";
import { CommandItem } from "@/common/components/command";
import { cn } from "@/common/functions/cn";
import {
  type Courses,
  type ClassExamTiming,
  type ClassTiming,
  type Professors,
} from "@prisma/client";
import { Tag } from "@/common/components/tag";
import { getHumanReadableTimestampString } from "@/common/functions";
import React from "react";
import { Heading } from "@/common/components/heading";

// TODO: find a better way for searching
export const ClassCard = ({
  course,
  section,
  classTiming,
  examTiming,
  professor,
}: {
  course: Courses;
  section: string;
  classTiming: Pick<
    ClassTiming,
    "dayOfWeek" | "startTime" | "endTime" | "venue"
  >[];
  examTiming: Partial<ClassExamTiming>[];
  professor?: Partial<Professors>;
}) => {
  const hasFullExamTiming =
    examTiming.length > 0 &&
    examTiming.every(
      (timing) =>
        timing.date && timing.dayOfWeek && timing.startTime && timing.endTime,
    );
  return (
    <div className="focus-ring bg-card flex h-fit w-75 cursor-pointer flex-col items-start gap-2 rounded-md border p-4 text-left md:gap-4">
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
      </div>
      <div className="flex items-center gap-2">
        <GraduationCapColoredIcon size={24} />
        <span className="w-full truncate tracking-tight">
          {professor?.name ?? "TBA"}
        </span>
      </div>
      <div>
        {classTiming.length > 0 ? (
          classTiming.map((timing, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2">
                <ClockIcon size={24} />
                <span className="">{timing.dayOfWeek}</span>
                <span className="">
                  {timing.startTime}-{timing.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PinIcon size={24} />
                <span className="tracking-tight">{timing.venue ?? "TBA"}</span>
              </div>
            </React.Fragment>
          ))
        ) : (
          <div className="">No class timings available</div>
        )}
      </div>
      <div>
        {hasFullExamTiming ? (
          examTiming.map((timing, index) => (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2">
                <MemoIcon size={24} />
                <span className="">
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
                <span className="">{timing.dayOfWeek}</span>
                <span className="">
                  {timing.startTime}-{timing.endTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PinIcon size={24} />
                <span className="tracking-tight">{timing.venue ?? "TBA"}</span>
              </div>
            </React.Fragment>
          ))
        ) : (
          <div className="">No exam timings available</div>
        )}
      </div>
    </div>
  );
};
