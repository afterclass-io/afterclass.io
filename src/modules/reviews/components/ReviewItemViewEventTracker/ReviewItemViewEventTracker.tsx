"use client";
import { api } from "@/common/tools/trpc/react";
import { ViewEventTracker } from "@/modules/tracker/components/ViewEventTracker";
import { ReviewEventType } from "@prisma/client";

export const ReviewItemViewEventTracker = (props: {
  reviewId: string;
  triggeringUserId: string;
  eventType?: ReviewEventType;
}) => {
  const { mutate } = api.reviewEvents.track.useMutation();

  return (
    <ViewEventTracker
      onChange={(inView, _) =>
        inView &&
        mutate({
          eventType: ReviewEventType.VIEW,
          ...props,
        })
      }
    />
  );
};
