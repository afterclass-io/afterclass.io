"use client";
import Link from "next/link";

import { buttonVariants } from "@/common/components/button";
import { Heading } from "@/common/components/heading";
import { cn } from "@/common/functions";

import { SlideEmbed } from "./slide-embed";
import { VoteButton } from "./vote-button";
import { api } from "@/common/tools/trpc/react";
import { useSession } from "next-auth/react";

export const Submission = ({
  id,
  teamName,
  slideEmbedUrl,
  submissionUrl,
}: {
  id: string;
  teamName: string;
  slideEmbedUrl: string;
  submissionUrl: string;
}) => {
  const { data: session } = useSession();

  const getVotesBySubmissionQuery = api.hackVotes.getBySubmission.useQuery({
    hackSubmissionId: id,
  });

  const utils = api.useUtils();
  const { mutate: likeOrUnlike } = api.hackVotes.voteOrUnvote.useMutation({
    onMutate: async ({ hackSubmissionId, weight }) => {
      // Cancel any outgoing refetches
      // (so they don't overwrite our optimistic update)
      await utils.hackVotes.getBySubmission.cancel();

      // Snapshot the previous value
      const prev = utils.hackVotes.getBySubmission.getData({
        hackSubmissionId,
      });

      // Optimistically update to the new value
      utils.hackVotes.getBySubmission.setData(
        { hackSubmissionId },
        (oldQueryData) => {
          if (!oldQueryData) return [];

          const userId = session?.user.id;
          if (!userId) return oldQueryData;

          const userVoteIdx = oldQueryData.findIndex(
            (vote) => vote.voterId === userId,
          );
          const userVote = oldQueryData.splice(userVoteIdx, 1)[0];

          if (!userVote)
            return [
              ...oldQueryData,
              {
                voterId: userId,
                weight,
                hackSubmissionId,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ];

          return [...oldQueryData, { ...userVote, weight }];
        },
      );

      // Return a context object with the snapshotted value
      return { prev };
    },
    onError: (_err, _variables, context) => {
      // Rollback to the previous value if mutation fails
      utils.hackVotes.getBySubmission.setData(
        { hackSubmissionId: id },
        context?.prev,
      );
    },
    // onSuccess: (_, { weight }) => {
    //   if (ecfg.enableReviewEventsTracking) {
    //     const eventType =
    //       weight > 0 ? ReviewEventType.UPVOTE : ReviewEventType.DOWNVOTE;

    //     track({ hackSubmissionId, eventType });
    //   }
    // },
    onSettled: () => {
      void utils.hackVotes.getBySubmission.invalidate({ hackSubmissionId: id });
    },
  });

  const totalVotes = getVotesBySubmissionQuery.data?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (acc, { weight }) => acc + weight,
    0,
  );

  const userVote = !!getVotesBySubmissionQuery.data?.some(
    (vote) => vote.voterId === session?.user.id && vote.weight > 0,
  );

  return (
    <div className="flex flex-col gap-1">
      <SlideEmbed src={slideEmbedUrl} />
      <Heading as="h3">{teamName}</Heading>
      <Link
        href={submissionUrl}
        className={cn(
          buttonVariants({
            variant: "link",
            className: "inline h-fit p-0 md:text-base",
          }),
        )}
      >
        Submission folder
      </Link>
      <VoteButton
        voted={userVote}
        totalVotes={totalVotes ?? 0}
        onVote={() => {
          likeOrUnlike({
            hackSubmissionId: id,
            weight: 1,
          });
        }}
        onUnvote={() => {
          likeOrUnlike({
            hackSubmissionId: id,
            weight: 0,
          });
        }}
      />
    </div>
  );
};
