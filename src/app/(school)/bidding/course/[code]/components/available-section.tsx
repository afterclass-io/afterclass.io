"use client";
import {
  type class_t,
  useCourseContext,
} from "@/app/(school)/bidding/course/[code]/contexts/course";
import { Separator } from "@/common/components/separator";

export function AvailableSectionContainer() {
  const { courseId, classes } = useCourseContext();

  return (
    <div>
      <div>Available sections for {courseId}</div>
      <div className="flex flex-col gap-8">
        {classes.map((item: class_t) => {
          return <AvailableSectionCard key={item.id} cls={item} />;
        })}
      </div>
    </div>
  );
}

interface AvailableSectionCardProps {
  cls: class_t;
}

function AvailableSectionCard({ cls }: AvailableSectionCardProps) {
  return (
    <div className="bg-card flex w-[700px] flex-col gap-4 p-4">
      <div className="flex flex-row justify-between">
        <div className="text-xl font-bold">Section: {cls.section}</div>
        <div>Select</div>
      </div>
      <Separator />
      <div className="flex flex-row gap-8">
        <div className="flex flex-col">
          <div className="text-xs">Day</div>
          <div>Monday</div>
        </div>

        <div className="flex flex-col">
          <div className="text-xs">Time</div>
          <div>8:30 - 11:30</div>
        </div>

        <div className="flex flex-col">
          <div className="text-xs">Professor</div>
          <div>{cls.professorId}</div>
        </div>

        <div className="flex flex-col">
          <div className="text-xs">Predicted Min bid</div>
          <div>20 e$</div>
        </div>
      </div>
    </div>
  );
}
