import { type Review } from "@/modules/reviews/types";
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
    <div className="flex w-full items-center justify-between gap-3 md:w-fit md:justify-normal">
      <SchoolIcon school={review.university} />
      {isShowProf ? (
        <ProgressLink
          variant="link"
          href={`/professor/${review.professorSlug}`}
          className="hover:text-primary text-muted-foreground hover:no-underline"
          aria-label="professor"
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
  );
};
