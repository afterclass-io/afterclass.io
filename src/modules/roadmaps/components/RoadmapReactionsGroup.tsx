"use client";
import { type ReviewReactionType as DbReviewReactionType } from "@/generated/prisma/client";

import { api } from "@/common/tools/trpc/react";
import { ReviewReactionType } from "@/modules/reviews/types";
import { useOptimisticReaction } from "@/modules/roadmaps/hooks/useOptimisticReaction";
import { Button } from "@/common/components/button";

export const RoadmapReactionsGroup = ({ roadmapId }: { roadmapId: string }) => {
  const roadmapReactionsQuery = api.roadmapReactions.getByRoadmapId.useQuery({
    roadmapId,
  });

  const { mutate: upsertReaction } = useOptimisticReaction();

  if (!roadmapReactionsQuery.data) {
    return;
  }

  const { counts, viewerReaction } = roadmapReactionsQuery.data;

  const handleReactionChange = (newReaction: DbReviewReactionType) => {
    if (viewerReaction === newReaction) {
      upsertReaction({
        roadmapId,
      });
    } else {
      upsertReaction({
        roadmapId,
        reaction: newReaction,
      });
    }
  };

  return (
    <div className="flex gap-2 overflow-auto">
      {counts.map(({ reaction, count }) => (
        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleReactionChange(reaction);
          }}
          key={reaction}
          variant={viewerReaction === reaction ? "default" : "outline"}
          className="flex min-w-fit cursor-pointer gap-1 rounded-full border px-2 py-0 select-none"
        >
          <span className="text-lg">
            {ReviewReactionType[reaction as keyof typeof ReviewReactionType]}
          </span>
          <span className="font-mono">{count}</span>
        </Button>
      ))}
    </div>
  );
};
