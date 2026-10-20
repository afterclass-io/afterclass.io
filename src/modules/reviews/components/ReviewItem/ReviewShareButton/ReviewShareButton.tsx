"use client";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ReviewEventType } from "@/generated/prisma/enums";

import { env } from "@/env";
import { api } from "@/common/tools/trpc/react";
import { Button } from "@/common/components/button";
import { ShareIcon } from "@/common/components/icons";
import { useEdgeConfigs } from "@/common/hooks";
import { useCopyToClipboard } from "@/common/hooks/use-copy-to-clipboard";
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
  const { status } = useSession();
  const { copy } = useCopyToClipboard();

  const { mutate: track } = api.reviewEvents.track.useMutation({
    onSuccess: () => {
      patchReviewInCaches(review.id, withShare);
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
        const ok = await copy(shareUrl, {
          successMessage: "Link copied to clipboard",
          errorMessage: "Failed to copy link",
          toastId: review.id,
        });
        // Anyone can copy the link; only a member's share is recorded.
        if (
          ok &&
          ecfg.enableReviewEventsTracking &&
          status === "authenticated"
        ) {
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
