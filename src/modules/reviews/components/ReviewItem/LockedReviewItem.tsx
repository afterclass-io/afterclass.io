import { LockedOverlay } from "@/common/components/locked-overlay";
import { FullWidthEnforcer } from "@/common/components/full-width-enforcer";

// Shown to a signed-out visitor while the `reviews` domain is private. It
// carries no review data: the header is blank bars and the body is the lock.
// The box sizes match ReviewItemSkeleton, so the feed keeps its shape.
export const LockedReviewItem = () => (
  <div
    className="flex h-fit max-w-prose flex-col items-start gap-2 rounded-md p-4 text-left md:gap-4"
    data-test="review-locked"
  >
    <div className="flex flex-col content-center gap-3 self-stretch overflow-hidden md:flex-row-reverse md:justify-between">
      <div className="bg-muted h-6 w-[100px] rounded-md" />
      <div className="bg-muted h-6 w-[200px] rounded-md" />
    </div>
    <div className="relative flex h-16 w-full self-stretch overflow-hidden rounded-sm border">
      <LockedOverlay ctaType="review" />
      <FullWidthEnforcer />
    </div>
  </div>
);
