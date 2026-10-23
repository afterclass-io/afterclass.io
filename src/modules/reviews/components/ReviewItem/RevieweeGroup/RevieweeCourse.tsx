"use client";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/common/components/tooltip";

import { ProgressLink } from "@/common/components/progress-link";

export const RevieweeCourse = ({
  courseCode,
  courseName,
}: {
  courseCode: string;
  courseName: string;
}) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ProgressLink
          variant="link"
          href={`/course/${courseCode}`}
          prefetch={false}
          className="hover:text-primary text-muted-foreground h-auto min-h-9 min-w-0 shrink break-words wrap-anywhere whitespace-normal hover:no-underline"
          data-test="review-course-label"
        >
          {courseCode}
          <span className="sr-only"> {courseName}</span>
        </ProgressLink>
      </TooltipTrigger>
      <TooltipContent>
        <span>{courseName}</span>
      </TooltipContent>
    </Tooltip>
  );
};
