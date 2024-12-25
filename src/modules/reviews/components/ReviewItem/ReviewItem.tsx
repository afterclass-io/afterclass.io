import { useCallback } from "react";

import { LockCtaOverlay } from "@/common/components/LockCtaOverlay";
import { type Review } from "@/modules/reviews/types";

import { reviewItemTheme, type ReviewItemVariants } from "./ReviewItem.theme";
import { ReviewerGroup } from "./ReviewerGroup";
import { RevieweeGroup } from "./RevieweeGroup";
import { ReviewBody } from "./ReviewBody";
import { ReviewModal } from "./ReviewModal";

export type ReviewItemProps = ReviewItemVariants & {
  review: Review;
  isLocked?: boolean;
  variant?: "home" | "professor" | "course";
  isMocked?: boolean; // for testing purposes only
  seeMore?: boolean;
};

export const ReviewItem = ({
  review,
  isLocked,
  variant = "home",
  isMocked = false,
  seeMore,
}: ReviewItemProps) => {
  const { wrapper, headingContainer, body } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });

  const ReviewHeader = useCallback(
    () => (
      <div className={headingContainer()}>
        <ReviewerGroup review={review} isMocked={isMocked} />
        <RevieweeGroup review={review} variant={variant} />
      </div>
    ),
    [review, isMocked, variant],
  );

  return (
    <>
      {isLocked ? (
        <div
          className={wrapper({
            className: "w-full max-w-full hover:bg-inherit lg:max-w-prose",
          })}
          data-variant="full-width"
          data-test="review"
        >
          <ReviewHeader />
          <div className={body({ isLocked })}>
            <LockCtaOverlay size="sm" ctaType="review" variant="border" />
          </div>
        </div>
      ) : (
        <ReviewModal review={review} variant={variant} seeMore={seeMore}>
          <div className={wrapper()} data-test="review">
            <ReviewHeader />
            <ReviewBody review={review} />
          </div>
        </ReviewModal>
      )}
    </>
  );
};
