"use client";
import { buttonVariants } from "@/common/components/button";
import { Heading } from "@/common/components/heading";
import { cn } from "@/common/functions";

import { SlideEmbed } from "./slide-embed";
import { VoteButton } from "./vote-button";
import { api } from "@/common/tools/trpc/react";
import { useSession } from "next-auth/react";
import { Separator } from "@/common/components/separator";
import { toast } from "sonner";

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

  const totalVotes = getVotesBySubmissionQuery.data?.reduce(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (acc, { weight }) => acc + weight,
    0,
  );

  const userVote = !!getVotesBySubmissionQuery.data?.some(
    (vote) => vote.voterId === session?.user.id && vote.weight > 0,
  );

  return (
    <div className="flex flex-col gap-2">
      <SlideEmbed src={slideEmbedUrl} />
      <Heading as="h3">{teamName}</Heading>
      <div className="flex items-center gap-3">
        <a
          href={submissionUrl}
          className={cn(
            buttonVariants({
              variant: "link",
              className: "inline h-fit p-0 md:text-base",
            }),
          )}
          target="_blank"
        >
          Figma Link
        </a>
        <Separator
          orientation="vertical"
          className="bg-muted-foreground data-[orientation=vertical]:h-2/3"
        />
        <a
          href={slideEmbedUrl}
          className={cn(
            buttonVariants({
              variant: "link",
              className: "inline h-fit p-0 md:text-base",
            }),
          )}
          target="_blank"
        >
          Slides Link
        </a>
      </div>
      <VoteButton
        voted={userVote}
        totalVotes={totalVotes ?? 0}
        onVote={() => {
          toast.info("Voting Phase has concluded", {
            description: "Thank you for your participation!",
          });
        }}
        onUnvote={() => {
          toast.info("Voting Phase has concluded", {
            description: "Thank you for your participation!",
          });
        }}
      />
    </div>
  );
};
