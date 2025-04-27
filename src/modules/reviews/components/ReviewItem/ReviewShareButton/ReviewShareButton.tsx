"use client";
import { usePathname } from "next/navigation";
import { ReviewEventType } from "@prisma/client";

import { env } from "@/env";
import { api } from "@/common/tools/trpc/react";
import { toast } from "sonner";
import { Button } from "@/common/components/button";
import { ShareIcon } from "@/common/components/icons";
import { useEdgeConfigs } from "@/common/hooks";
import { Loader2 } from "lucide-react";

export type ReviewShareButtonProps = {
  reviewId: string;
};

export const ReviewShareButton = ({
  reviewId,
  ...props
}: ReviewShareButtonProps) => {
  const pathname = usePathname();
  const ecfg = useEdgeConfigs();

  const shareCountQuery = api.reviewEvents.countEvent.useQuery({
    reviewId,
    eventType: ReviewEventType.SHARE,
  });
  const { mutate: track } = api.reviewEvents.track.useMutation({
    onSuccess: () => {
      void shareCountQuery.refetch();
    },
  });
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Share"
      data-umami-event="review-share"
      disabled={shareCountQuery.isLoading}
      className="h-8 rounded-full"
      onClick={async () => {
        const shareUrl = `${env.NEXT_PUBLIC_SITE_URL}${pathname}?review_id=${reviewId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard", { id: reviewId });
        if (ecfg.enableReviewEventsTracking) {
          track({
            reviewId,
            eventType: ReviewEventType.SHARE,
          });
        }
      }}
      {...props}
    >
      {shareCountQuery.isLoading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          <ShareIcon />
          <span className="font-mono">{shareCountQuery.data}</span>
        </>
      )}
    </Button>
  );
};
