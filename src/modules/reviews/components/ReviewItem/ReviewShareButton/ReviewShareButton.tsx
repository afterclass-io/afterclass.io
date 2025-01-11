"use client";
import { usePathname } from "next/navigation";
import { ReviewEventType } from "@prisma/client";

import { env } from "@/env";
import { api } from "@/common/tools/trpc/react";
import { toast } from "@/common/components/Toast";
import {
  Button,
  type ButtonVariants,
  type ButtonBaseProps,
  type ButtonProps,
} from "@/common/components/Button";
import { ShareIcon } from "@/common/components/CustomIcon";

export type ReviewShareButtonProps = ButtonProps &
  ButtonBaseProps &
  Omit<ButtonVariants, "hasIcon" | "iconOnly"> & {
    reviewId: string;
    triggeringUserId?: string;
  };

export const ReviewShareButton = ({
  reviewId,
  triggeringUserId,
  ...props
}: ReviewShareButtonProps) => {
  const pathname = usePathname();

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
      rounded
      variant="tertiary"
      size="sm"
      iconLeft={<ShareIcon />}
      loading={shareCountQuery.isLoading}
      aria-label="Share"
      data-umami-event="share-review"
      onClick={async () => {
        const shareUrl = `${env.NEXT_PUBLIC_SITE_URL}${pathname}?review_id=${reviewId}`;
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard", { id: reviewId });
        track({
          reviewId,
          triggeringUserId,
          eventType: ReviewEventType.SHARE,
        });
      }}
      {...props}
    >
      {shareCountQuery.data}
    </Button>
  );
};
