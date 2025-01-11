"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { ReviewModal } from "../ReviewItem/ReviewModal";
import { api } from "@/common/tools/trpc/react";
import { toast } from "@/common/components/Toast";

export const ReviewModalFocused = ({
  variant,
}: {
  variant: "home" | "professor" | "course";
}) => {
  const reviewId = useSearchParams().get("review_id");

  const session = useSession({ required: true });
  if (!reviewId || session.status === "loading") return null;

  const reviewQuery = api.reviews.getById.useQuery(reviewId);
  if (reviewQuery.status !== "success") {
    if (reviewQuery.status === "error") {
      toast.error("Review not found", {
        id: reviewId,
        description: "Please check the link or try again later",
      });
    }
    return null;
  }

  return (
    <ReviewModal variant={variant} review={reviewQuery.data} defaultOpen />
  );
};
