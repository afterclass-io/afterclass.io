"use client";
import { usePathname } from "next/navigation";
import { ReviewEventType } from "@/generated/prisma/enums";

import { env } from "@/env";
import { api } from "@/common/tools/trpc/react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { ShareIcon } from "@/common/components/icons";
import { useEdgeConfigs } from "@/common/hooks";
import { type Review } from "@/common/types/reviews";
import { patchReviewInCaches } from "@/modules/reviews/hooks/patch-review-caches";
import { withShare } from "@/modules/reviews/functions/engagement";

export type ReviewShareButtonProps = {
  review: Review;
};

export const ReviewShareButton = ({
  review,
  ...props
}: ReviewShareButtonProps) => {
  const pathname = usePathname();
  const ecfg = useEdgeConfigs();
  const utils = api.useUtils();

  const { mutate: track } = api.reviewEvents.track.useMutation({
    onSuccess: () => {
      patchReviewInCaches(utils, review.id, withShare);
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Share"
      data-umami-event="review-share"
      className="h-8 rounded-full"
      onClick={async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const shareUrl = `${env.NEXT_PUBLIC_SITE_URL}${pathname}?review_id=${review.id}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard", { id: review.id });
        if (ecfg.enableReviewEventsTracking) {
          track({
            reviewId: review.id,
            eventType: ReviewEventType.SHARE,
          });
        }
      }}
      {...props}
    >
      <ShareIcon />
      <span className="font-mono">{review.engagement?.shareCount ?? 0}</span>
    </Button>
  );
};
