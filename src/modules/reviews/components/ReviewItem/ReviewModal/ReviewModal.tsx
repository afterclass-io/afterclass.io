"use client";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";

import { Modal } from "@/common/components/Modal";
import { ShareIcon, ThumbUpFilledIcon } from "@/common/components/CustomIcon";
import { type Review } from "@/modules/reviews/types";
import { Button } from "@/common/components/Button";
import { ProgressLink } from "@/common/components/Progress";

import { reviewItemTheme } from "../ReviewItem.theme";
import { RevieweeGroup } from "../RevieweeGroup";
import { ReviewLikeButton } from "../ReviewLikeButton";
import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { ReviewRatingGroup } from "../ReviewRatingGroup";
import { ReviewLabelGroup } from "../ReviewLabelGroup";

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
    likeAndShareWrapper,
    seeMoreDivider,
    seeMoreLink,
  } = reviewItemTheme({ size: { initial: "sm", md: "md" } });

  const reviewPath =
    review.reviewFor === "professor"
      ? `/professor/${review.professorSlug}`
      : `/course/${review.courseCode}`;

  const { mutate } = api.reviewEvents.track.useMutation();
  const { data: session } = useSession();

  return (
    <Modal
      overflow="inside"
      defaultOpen={defaultOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) return;
        mutate({
          eventType: ReviewEventType.INTERACTION,
          reviewId: review.id,
          triggeringUserId: session?.user?.id,
        });
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
          <div className={likeAndShareWrapper()}>
            <ReviewLikeButton
              reviewId={review.id}
              iconLeft={<ThumbUpFilledIcon />}
              iconRight={undefined}
            />
            <Button
              rounded
              variant="tertiary"
              size="sm"
              iconLeft={<ShareIcon />}
              aria-label="Share"
              data-umami-event="share-review"
              onClick={() => void console.log("Share review")}
            >
              0
            </Button>
          </div>
          {/* seeMore link only shown when user is from default reviews page, hidden when in professor/course pages */}
          {seeMore && (
            <>
              <hr className={seeMoreDivider()} />
              <ProgressLink
                href={reviewPath}
                variant="link"
                className={seeMoreLink()}
                isResponsive
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
