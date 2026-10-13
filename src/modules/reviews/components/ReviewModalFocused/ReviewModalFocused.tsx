"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ReviewModal } from "../ReviewItem/ReviewModal";
import { api } from "@/common/tools/trpc/react";
import { toast } from "sonner";

export const ReviewModalFocused = ({
  variant,
}: {
  variant: "home" | "professor" | "course";
}) => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const reviewId = searchParams?.get("review_id") ?? null;
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  // Every hook runs on every render. Conditions go in `enabled` and the
  // effects, never in an early return above a hook.
  const reviewQuery = api.reviews.getById.useQuery(reviewId ?? "", {
    enabled: reviewId !== null && sessionStatus === "authenticated",
  });

  const signedOut = sessionStatus === "unauthenticated";
  const queryString = searchParams?.toString() ?? "";
  useEffect(() => {
    if (!reviewId || !signedOut) return;
    const here = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(`/account/auth/login?callbackUrl=${encodeURIComponent(here)}`);
  }, [reviewId, signedOut, pathname, queryString, router]);

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
