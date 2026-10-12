"use client";
import { ReactionPickerButton } from "@/common/components/reaction-picker-button";
import { useOptimisticReaction } from "@/modules/roadmaps/hooks/useOptimisticReaction";

export const RoadmapReactionButton = ({ roadmapId }: { roadmapId: string }) => {
  const { mutate: upsertReaction } = useOptimisticReaction();

  return (
    <ReactionPickerButton
      umamiEvent="roadmap-react"
      onSelect={(reaction) => upsertReaction({ roadmapId, reaction })}
    />
  );
};
