import { type Review } from "@/common/types/reviews";
import { SchoolIcon } from "@/common/components/icons";
import { ProgressLink } from "@/common/components/progress-link";

import { RevieweeCourse } from "./RevieweeCourse";

export type RevieweeGroupProps = {
  review: Review;
  variant: "home" | "professor" | "course";
};

export const RevieweeGroup = ({ review, variant }: RevieweeGroupProps) => {
  const isShowProf =
    review.professorName && (variant === "home" || variant === "course");

  const isShowCourse = variant === "home" && isShowProf;

  return (
    <div className="flex w-full min-w-0 items-start md:w-auto">
      <SchoolIcon school={review.university} className="mt-0.5 mr-2 shrink-0" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-1">
        {isShowProf ? (
          <ProgressLink
            variant="link"
            href={`/professor/${review.professorSlug}`}
            prefetch={false}
            className="hover:text-primary text-muted-foreground h-auto min-h-9 min-w-0 shrink break-words whitespace-normal hover:no-underline"
            data-test="review-professor-label"
          >
            {review.professorName}
          </ProgressLink>
        ) : (
          <RevieweeCourse
            courseCode={review.courseCode}
            courseName={review.courseName}
          />
        )}
        {isShowCourse && (
          <RevieweeCourse
            courseCode={review.courseCode}
            courseName={review.courseName}
          />
        )}
      </div>
    </div>
  );
};
