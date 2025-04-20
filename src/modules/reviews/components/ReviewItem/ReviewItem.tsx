import { useCallback } from "react";
import { useSession } from "next-auth/react";

import { LockedOverlay } from "@/common/components/locked-overlay";
import { type Review } from "@/modules/reviews/types";

import { reviewItemTheme, type ReviewItemVariants } from "./ReviewItem.theme";
import { ReviewerGroup } from "./ReviewerGroup";
import { RevieweeGroup } from "./RevieweeGroup";
import { ReviewBody } from "./ReviewBody";
import { ReviewFooter } from "./ReviewFooter";
import { ReviewModal } from "./ReviewModal";
import { ReviewItemViewEventTracker } from "../ReviewItemViewEventTracker";

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
  const session = useSession();
  const { wrapper, headingContainer, body } = reviewItemTheme({
    size: { initial: "sm", md: "md" },
  });

  const ReviewHeader = useCallback(
    () => (
      <div className={headingContainer()}>
        <ReviewerGroup review={review} />
        <RevieweeGroup review={review} variant={variant} />
      </div>
    ),
    [review, variant],
  );

  return !(session.status === "authenticated") || isLocked ? (
    <div
      className={wrapper({
        className: "w-full max-w-full hover:bg-inherit lg:max-w-prose",
      })}
      data-variant="full-width"
      data-test="review"
    >
      <ReviewHeader />
      <div className={body({ isLocked })}>
        <LockedOverlay ctaType="review" />
      </div>
    </div>
  ) : (
    <ReviewModal review={review} variant={variant} seeMore={seeMore}>
      <div className={wrapper()} data-test="review">
        <ReviewHeader />
        <ReviewBody review={review} />
        <ReviewFooter review={review} />
        {!isMocked && <ReviewItemViewEventTracker reviewId={review.id} />}
      </div>
    </ReviewModal>
  );
};
