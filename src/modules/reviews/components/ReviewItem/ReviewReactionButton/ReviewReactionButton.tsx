"use client";
import { useSession } from "next-auth/react";
import { ReactionPickerButton } from "@/common/components/reaction-picker-button";
import { useOptimisticReaction } from "@/modules/reviews/hooks";

export const ReviewReactionButton = ({ reviewId }: { reviewId: string }) => {
  const { status } = useSession();
  const { mutate: upsertReaction } = useOptimisticReaction();

  // Reacting is members-only, so signed-out readers of a public review only
  // see the existing reaction counts.
  if (status !== "authenticated") return null;

  return (
    <ReactionPickerButton
      umamiEvent="review-react"
      onSelect={(reaction) => upsertReaction({ reviewId, reaction })}
    />
  );
};
