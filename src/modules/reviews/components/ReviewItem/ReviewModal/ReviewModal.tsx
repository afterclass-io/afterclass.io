"use client";
import PhShareFat from "~icons/ph/share-fat";

import { Modal } from "@/common/components/Modal";

import { type Review } from "@/modules/reviews/types";
import { Button } from "@/common/components/Button";

import { reviewItemTheme } from "../ReviewItem.theme";
import { RevieweeGroup } from "../RevieweeGroup";
import { ReviewLikeButton } from "../ReviewLikeButton";
import { ReviewCreatedAt } from "../ReviewCreatedAt";

export const ReviewModal = ({
  review,
  variant,
  children,
  seeMore = false,
}: {
  review: Review;
  variant: "home" | "professor" | "course";
  children: React.ReactNode;
  seeMore?: boolean;
}) => {
  const {
    modalTrigger,
    modalContent,
    usernameAndTimestampWrapper,
    username,
    modalBody,
    likeAndShareWrapper,
    seeMoreDivider,
    seeMoreLink,
  } = reviewItemTheme({ size: { initial: "sm", md: "md" } });

  const reviewPath =
    review.reviewFor === "professor"
      ? `/professor/${review.professorSlug}`
      : `/course/${review.courseCode}`;

  return (
    <Modal overflow="inside">
      <Modal.Trigger asChild className={modalTrigger()}>
        {children}
      </Modal.Trigger>
      <Modal.Content
        className={modalContent()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-test="review-modal"
      >
        <Modal.Header>
          <RevieweeGroup review={review} variant={variant} />
        </Modal.Header>
        <Modal.Body>
          <div className={usernameAndTimestampWrapper()}>
            <span className={username()}>{review.username}</span>
            <span>•</span>
            <ReviewCreatedAt createdAt={review.createdAt} />
          </div>
          <p className={modalBody()}>{review.body}</p>
        </Modal.Body>
        <Modal.Footer>
          <div className={likeAndShareWrapper()}>
            <ReviewLikeButton reviewId={review.id} />
            <Button
              rounded
              variant="tertiary"
              iconLeft={<PhShareFat />}
              aria-label="Share"
              size="sm"
            >
              0
            </Button>
          </div>
          {/* seeMore link only shown when user is from default reviews page, hidden when in professor/course pages */}
          {seeMore && (
            <>
              <hr className={seeMoreDivider()} />
              <Button
                as="a"
                variant="link"
                href={reviewPath}
                className={seeMoreLink()}
                isResponsive
              >
                See more reviews
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};
