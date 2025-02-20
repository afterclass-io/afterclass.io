"use client";
import { useSession } from "next-auth/react";
import { ReviewEventType, ReviewType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";

import { Modal } from "@/common/components/Modal";
import { type Review } from "@/modules/reviews/types";
import { ProgressLink } from "@/common/components/Progress";

import { reviewItemTheme } from "../ReviewItem.theme";
import { RevieweeGroup } from "../RevieweeGroup";
import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { ReviewRatingGroup } from "../ReviewRatingGroup";
import { ReviewLabelGroup } from "../ReviewLabelGroup";
import { useEdgeConfigs } from "@/common/hooks";
import { ReviewFooter } from "../ReviewFooter";

export const ReviewModal = ({
  review,
  variant,
  children,
  seeMore = false,
  defaultOpen = false,
}: {
  review: Review;
  variant: "home" | "professor" | "course";
  children?: React.ReactNode;
  seeMore?: boolean;
  defaultOpen?: boolean;
}) => {
  const {
    modalTrigger,
    modalContent,
    usernameAndTimestampWrapper,
    username,
    modalBody,
    seeMoreDivider,
    seeMoreLink,
  } = reviewItemTheme({ size: { initial: "sm", md: "md" } });

  const ecfg = useEdgeConfigs();

  const reviewPath =
    review.reviewFor === ReviewType.PROFESSOR
      ? `/professor/${review.professorSlug}`
      : `/course/${review.courseCode}`;

  const { mutate: track } = api.reviewEvents.track.useMutation();

  return (
    <Modal
      overflow="inside"
      defaultOpen={defaultOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) return;
        if (ecfg.enableReviewEventsTracking) {
          track({
            reviewId: review.id,
            eventType: ReviewEventType.INTERACTION,
          });
        }
      }}
    >
      {children && (
        <Modal.Trigger asChild className={modalTrigger()}>
          {children}
        </Modal.Trigger>
      )}
      <Modal.Content
        className={modalContent()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-test="review-modal"
      >
        <Modal.Header>
          <Modal.Title>
            <RevieweeGroup review={review} variant={variant} />
          </Modal.Title>
          <Modal.Description asChild>
            <div className="space-y-4">
              <div className={usernameAndTimestampWrapper()}>
                <span className={username()}>{review.username}</span>
                <span>•</span>
                <ReviewCreatedAt createdAt={review.createdAt} />
              </div>
              <ReviewRatingGroup rating={review.rating} />
              <ReviewLabelGroup reviewLabels={review.reviewLabels} />
            </div>
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <div className={modalBody()}>{review.body}</div>
        </Modal.Body>
        <Modal.Footer>
          <ReviewFooter review={review} />
          {/* seeMore link only shown when user is from default reviews page, hidden when in professor/course pages */}
          {seeMore && (
            <>
              <hr className={seeMoreDivider()} />
              <ProgressLink
                href={reviewPath}
                variant="link"
                className={seeMoreLink()}
              >
                See more reviews
              </ProgressLink>
            </>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};
