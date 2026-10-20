"use client";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@/generated/prisma/enums";

import { useEdgeConfigs } from "@/common/hooks";
import { api } from "@/common/tools/trpc/react";
import { ViewEventTracker } from "@/modules/tracker/components/ViewEventTracker";

export const ReviewItemViewEventTracker = (props: {
  reviewId: string;
  eventType?: ReviewEventType;
}) => {
  const ecfg = useEdgeConfigs();
  const { status } = useSession();
  const { mutate: track } = api.reviewEvents.track.useMutation();

  // `reviewEvents.track` is members-only; signed-out readers of a public
  // review are not tracked.
  return (
    ecfg.enableReviewEventsTracking &&
    status === "authenticated" && (
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
