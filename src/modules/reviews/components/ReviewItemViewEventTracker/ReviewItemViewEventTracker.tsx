"use client";
import { ReviewEventType } from "@prisma/client";

import { useEdgeConfigs } from "@/common/hooks";
import { api } from "@/common/tools/trpc/react";
import { ViewEventTracker } from "@/modules/tracker/components/ViewEventTracker";

export const ReviewItemViewEventTracker = (props: {
  reviewId: string;
  eventType?: ReviewEventType;
}) => {
  const ecfg = useEdgeConfigs();
  const { mutate: track } = api.reviewEvents.track.useMutation();

  return (
    ecfg.enableReviewEventsTracking && (
      <ViewEventTracker
        onChange={(inView, _) =>
          inView &&
          track({
            eventType: ReviewEventType.VIEW,
            ...props,
          })
        }
      />
    )
  );
};
