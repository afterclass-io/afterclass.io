"use client";
import { ReactionPickerButton } from "@/common/components/reaction-picker-button";
import { useOptimisticReaction } from "@/modules/reviews/hooks";

export const ReviewReactionButton = ({ reviewId }: { reviewId: string }) => {
  const { mutate: upsertReaction } = useOptimisticReaction();

  return (
    <ReactionPickerButton
      umamiEvent="review-react"
      onSelect={(reaction) => upsertReaction({ reviewId, reaction })}
    />
  );
};
