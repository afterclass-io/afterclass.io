"use client";
import { ReviewEventType, ReviewType } from "@prisma/client";

import { api } from "@/common/tools/trpc/react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/common/components/dialog";
import { type Review } from "@/modules/reviews/types";
import { ProgressLink } from "@/common/components/progress-link";

import { RevieweeGroup } from "../RevieweeGroup";
import { ReviewCreatedAt } from "../ReviewCreatedAt";
import { ReviewRatingGroup } from "../ReviewRatingGroup";
import { ReviewLabelGroup } from "../ReviewLabelGroup";
import { useEdgeConfigs } from "@/common/hooks";
import { ReviewFooter } from "../ReviewFooter";
import { Separator } from "@/common/components/separator";

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
  const ecfg = useEdgeConfigs();

  const reviewPath =
    review.reviewFor === ReviewType.PROFESSOR
      ? `/professor/${review.professorSlug}`
      : `/course/${review.courseCode}`;

  const { mutate: track } = api.reviewEvents.track.useMutation();

  return (
    <Dialog
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
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent
        className="gap-4 md:mx-10 md:my-auto md:h-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-test="review-modal"
      >
        <DialogHeader className="text-left">
          <DialogTitle>
            <RevieweeGroup review={review} variant={variant} />
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-4">
              <div className="space-x-2">
                <span className="font-medium">{review.username}</span>
                <span>•</span>
                <ReviewCreatedAt createdAt={review.createdAt} />
              </div>
              <ReviewRatingGroup rating={review.rating} />
              <ReviewLabelGroup reviewLabels={review.reviewLabels} />
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="wrap-anywhere whitespace-pre-wrap">
          {review.body}
        </DialogBody>
        <DialogFooter className="flex-col sm:flex-col">
          <ReviewFooter review={review} />
          {/* seeMore link only shown when user is from default reviews page, hidden when in professor/course pages */}
          {seeMore && (
            <>
              <Separator className="mt-4 mb-2" />
              <ProgressLink
                href={reviewPath}
                variant="link"
                className="flex h-fit p-0 md:h-9 md:p-2"
              >
                See more reviews
              </ProgressLink>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
