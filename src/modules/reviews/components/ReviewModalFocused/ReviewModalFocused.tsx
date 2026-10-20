"use client";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { ReviewModal } from "../ReviewItem/ReviewModal";
import { api } from "@/common/tools/trpc/react";
import { toast } from "sonner";

export const ReviewModalFocused = ({
  variant,
}: {
  variant: "home" | "professor" | "course";
}) => {
  const searchParams = useSearchParams();
  const reviewId = searchParams?.get("review_id") ?? null;

  // Pages render this only for a viewer who may read reviews (a member, or
  // anyone while `reviews` is public), so the link opens for signed-out
  // visitors too. A signed-out visitor on a locked feed sees the overlay.
  // Every hook runs on every render. Conditions go in `enabled` and the
  // effects, never in an early return above a hook.
  const reviewQuery = api.reviews.getById.useQuery(reviewId ?? "", {
    enabled: reviewId !== null,
  });

  const queryFailed = reviewQuery.status === "error";
  useEffect(() => {
    if (!reviewId || !queryFailed) return;
    toast.error("Review not found", {
      id: reviewId,
      description: "Please check the link or try again later",
    });
  }, [reviewId, queryFailed]);

  if (!reviewId || reviewQuery.status !== "success") return null;

  return (
    <ReviewModal variant={variant} review={reviewQuery.data} defaultOpen />
  );
};
