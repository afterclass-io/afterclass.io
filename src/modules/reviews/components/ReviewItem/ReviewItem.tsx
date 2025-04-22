import { useCallback } from "react";
import { useSession } from "next-auth/react";

import { LockedOverlay } from "@/common/components/locked-overlay";
import { type Review } from "@/modules/reviews/types";

import { ReviewerGroup } from "./ReviewerGroup";
import { RevieweeGroup } from "./RevieweeGroup";
import { ReviewBody } from "./ReviewBody";
import { ReviewFooter } from "./ReviewFooter";
import { ReviewModal } from "./ReviewModal";
import { ReviewItemViewEventTracker } from "../ReviewItemViewEventTracker";

export type ReviewItemProps = {
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

  const ReviewHeader = useCallback(
    () => (
      <div className="flex flex-col content-center gap-3 self-stretch md:flex-row-reverse md:justify-between">
        <ReviewerGroup review={review} />
        <RevieweeGroup review={review} variant={variant} />
      </div>
    ),
    [review, variant],
  );

  return !(session.status === "authenticated") || isLocked ? (
    <div
      className="focus-ring hover:bg-surface-elevated flex h-fit max-w-prose cursor-pointer flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4"
      data-test="review"
    >
      <ReviewHeader />
      <div className="text-muted-foreground relative line-clamp-5 flex h-16 w-full self-stretch overflow-hidden rounded-sm border wrap-anywhere md:line-clamp-3 md:text-sm">
        <LockedOverlay ctaType="review" />
        <span aria-hidden className="text-transparent select-none">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
          culpa qui officia deserunt mollit anim id est laborum
        </span>
      </div>
    </div>
  ) : (
    <ReviewModal review={review} variant={variant} seeMore={seeMore}>
      <div
        className="focus-ring hover:bg-surface-elevated flex h-fit max-w-prose cursor-pointer flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4"
        data-test="review"
      >
        <ReviewHeader />
        <ReviewBody review={review} />
        <ReviewFooter review={review} />
        {!isMocked && <ReviewItemViewEventTracker reviewId={review.id} />}
      </div>
    </ReviewModal>
  );
};
