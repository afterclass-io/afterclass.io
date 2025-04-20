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
      <TooltipTrigger>
        <ProgressLink
          variant="link"
          href={`/course/${courseCode}`}
          className="hover:text-primary-default hover:no-underline"
          aria-label="course"
          data-test="review-course-label"
        >
          {courseCode}
        </ProgressLink>
      </TooltipTrigger>
      <TooltipContent>
        <span>{courseName}</span>
      </TooltipContent>
    </Tooltip>
  );
};
