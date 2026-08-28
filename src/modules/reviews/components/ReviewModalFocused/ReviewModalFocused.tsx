"use client";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { skipToken } from "@tanstack/react-query";

import { ReviewModal } from "../ReviewItem/ReviewModal";
import { api } from "@/common/tools/trpc/react";
import { toast } from "sonner";

export const ReviewModalFocused = ({
  variant,
}: {
  variant: "home" | "professor" | "course";
}) => {
  const searchParams = useSearchParams();
  const reviewId = searchParams?.get("review_id");
  const router = useRouter();
  const session = useSession();
  const reviewQuery = api.reviews.getById.useQuery(reviewId ?? skipToken);

  if (!reviewId) return null;

  if (session.status !== "authenticated") {
    if (session.status === "loading") return null;
    router.push("/account/auth/login?callbackUrl=" + window.location.href);
  }

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
