import { type Review } from "@/modules/reviews/types";
import { profileTheme } from "@/common/components/Profile";
import { SchoolIcon } from "@/common/components/CustomIcon";
import { ProgressLink } from "@/common/components/Progress";

import { RevieweeCourse } from "./RevieweeCourse";
import { reviewItemTheme, type ReviewItemVariants } from "../ReviewItem.theme";

export type RevieweeGroupProps = ReviewItemVariants & {
  review: Review;
  variant: "home" | "professor" | "course";
};

export const RevieweeGroup = ({ review, variant }: RevieweeGroupProps) => {
  const { revieweeGroup } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });
  const { name: profileNameClass } = profileTheme();

  const isShowProf =
    review.professorName && (variant === "home" || variant === "course");

  const isShowCourse = variant === "home" && isShowProf;

  return (
    <div className={revieweeGroup()}>
      <SchoolIcon school={review.university} />
      {isShowProf ? (
        <ProgressLink
          variant="link"
          href={`/professor/${review.professorSlug}`}
          className={profileNameClass({
            class: "hover:text-primary-default hover:no-underline",
          })}
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
