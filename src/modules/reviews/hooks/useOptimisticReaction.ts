import { useEdgeConfigs } from "@/common/hooks";
import { api } from "@/common/tools/trpc/react";
import type { RouterInputs } from "@/common/tools/trpc/react";
import { createOptimisticMutationCallbacks } from "@/common/hooks/create-optimistic-mutation-callbacks";
import { ReviewEventType } from "@/generated/prisma/enums";
import { useSession } from "next-auth/react";
import { useCallback, useMemo, useRef } from "react";

import { debounce } from "@/common/functions/debounce";

export function useOptimisticReaction() {
  const { data: session } = useSession();
  const ecfg = useEdgeConfigs();

  const utils = api.useUtils();
  const lastInputRef = useRef<{ reviewId: string } | null>(null);
  const { mutate: track } = api.reviewEvents.track.useMutation();

  const mutation = api.reviewReactions.upsert.useMutation({
    ...createOptimisticMutationCallbacks<
      RouterInputs["reviewReactions"]["upsert"],
      unknown
    >({
      cancel: async () => {
        if (lastInputRef.current) {
          await utils.reviewReactions.getByReviewId.cancel(
            lastInputRef.current,
          );
        }
      },
      getSnapshot: () =>
        lastInputRef.current
          ? utils.reviewReactions.getByReviewId.getData(lastInputRef.current)
          : undefined,
      // Pattern A: the caller (mutateWithDebounce) already applied the optimistic
      // update for instant feedback — re-applying here would double-increment.
      applyOptimistic: () => {
        /* Pattern A: caller (mutateWithDebounce) already applied */
      },
      restoreSnapshot: (prev) => {
        if (lastInputRef.current) {
          utils.reviewReactions.getByReviewId.setData(
            lastInputRef.current,
            prev as never,
          );
        }
      },
      invalidate: async () => {
        if (lastInputRef.current) {
          await utils.reviewReactions.getByReviewId.invalidate(
            lastInputRef.current,
          );
        }
      },
    }),
    onSuccess: (_data, { reviewId, reaction }) => {
      if (reaction && ecfg.enableReviewEventsTracking) {
        track({
          reviewId,
          eventType: ReviewEventType.REACTION,
        });
      }
    },
  });
  const mutate = mutation.mutate;

  const applyOptimisticUpdate = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      const { reviewId, reaction } = variables;

      utils.reviewReactions.getByReviewId.setData(
        { reviewId },
        (oldQueryData) => {
          const reactingUserId = session?.user.id ?? "";

          // when user undo their reaction
          if (!reaction) {
            return oldQueryData?.filter(
              (reaction) => reaction.reactingUserId !== reactingUserId,
            );
          }

          // when user has new reaction
          const now = new Date();
          const newReaction = {
            reaction: reaction,
            reactingUserId,
            reviewId,
            createdAt: now,
            updatedAt: now,
          };

          // when there are no other reactions on this review
          if (!oldQueryData) return [newReaction];

          // remove the other reaction by the same user if it exists
          const updatedReactions = oldQueryData.filter(
            (reaction) => reaction.reactingUserId !== reactingUserId,
          );

          return [...updatedReactions, newReaction];
        },
      );
    },
    [session?.user.id, utils.reviewReactions.getByReviewId],
  );

  const debouncedMutate = useMemo(
    () =>
      debounce((variables: Parameters<typeof mutate>[0]) => {
        mutate(variables);
      }, 300),
    [mutate],
  );

  const mutateWithDebounce = useCallback(
    (variables: Parameters<typeof mutate>[0]) => {
      lastInputRef.current = { reviewId: variables.reviewId };
      applyOptimisticUpdate(variables); // immediate UI update
      debouncedMutate(variables); // debounced server mutation
    },
    [applyOptimisticUpdate, debouncedMutate],
  );

  return {
    ...mutation,
    mutate: mutateWithDebounce,
  };
}
