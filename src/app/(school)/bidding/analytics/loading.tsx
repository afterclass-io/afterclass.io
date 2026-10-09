"use client";

import { useSearchParams } from "next/navigation";

import { BidAnalyticsSkeleton } from "@/modules/bidding/components/BidAnalyticsSkeleton";
import { BiddingExplorerSkeleton } from "@/modules/bidding/components/BiddingExplorerSkeleton";

// The page renders the class picker until a class is named, and the analytics
// view after. The two differ in height by thousands of pixels, so the
// fallback follows the same rule as the page.
export default function Loading() {
  const searchParams = useSearchParams();
  const namesClass =
    searchParams.has("classId") ||
    (searchParams.has("course") && searchParams.has("section"));

  return namesClass ? <BidAnalyticsSkeleton /> : <BiddingExplorerSkeleton />;
}
