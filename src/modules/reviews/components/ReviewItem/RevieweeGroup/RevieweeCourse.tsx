"use client";
import { Tooltip } from "@/common/components/Tooltip";
import { profileTheme } from "@/common/components/Profile";
import { ProgressLink } from "@/common/components/Progress";

export const RevieweeCourse = ({
  courseCode,
  courseName,
}: {
  courseCode: string;
  courseName: string;
}) => {
  const { name: profileNameClass } = profileTheme();
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <ProgressLink
          variant="link"
          href={`/course/${courseCode}`}
          className={profileNameClass({
            class: "hover:text-primary-default hover:no-underline",
          })}
          aria-label="course"
          data-test="review-course-label"
        >
          {courseCode}
        </ProgressLink>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <span>{courseName}</span>
      </Tooltip.Content>
    </Tooltip>
  );
};
