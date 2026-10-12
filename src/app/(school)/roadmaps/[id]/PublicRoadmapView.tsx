"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  Loader2,
  CalendarDays,
  GraduationCap,
  Heart,
  Share2,
  User,
} from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { useCopyToClipboard } from "@/common/hooks/use-copy-to-clipboard";
import { RoadmapVoteGroup } from "@/modules/roadmaps/components/RoadmapVoteGroup";
import { RoadmapReactionButton } from "@/modules/roadmaps/components/RoadmapReactionButton";
import { RoadmapReactionsGroup } from "@/modules/roadmaps/components/RoadmapReactionsGroup";
import {
  ReadOnlyRoadmapBody,
  RoadmapViewModeToggle,
  RoadmapsBackLink,
  type RoadmapViewMode,
} from "@/modules/roadmaps/components/ReadOnlyRoadmapBody";
import { ReportButton } from "@/modules/moderation/components/ReportButton";
import { Button } from "@/common/components/button";
import { PageTitle } from "@/common/components/page-title";
import { ShareIcon } from "@/common/components/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/common/components/tooltip";
import { formatDateSGT } from "@/common/functions/format-date-sgt";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PublicRoadmapViewProps = {
  roadmapId: string;
  roadmapName: string;
  /** Optional owner-written description (rendered under the header) */
  description?: string | null;
  ownerUsername: string;
  /** Owner's faculty (null when the owner never set one) */
  ownerFaculty: { name: string; acronym: string } | null;
  publishedAt: Date | string | null;
  viewCount: number;
  shareCount: number;
  voteCount: number;
  viewerHasVoted: boolean;
  entries: Entry[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PublicRoadmapView({
  roadmapId,
  roadmapName,
  description,
  ownerUsername,
  ownerFaculty,
  publishedAt,
  viewCount,
  shareCount,
  voteCount,
  viewerHasVoted,
  entries,
}: PublicRoadmapViewProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [copying, setCopying] = useState(false);
  const [viewMode, setViewMode] = useState<RoadmapViewMode>("grid");

  // ---- Engagement: record one view per browser session ----
  const recordViewMutation = api.roadmaps.recordView.useMutation();
  useEffect(() => {
    const key = `roadmap-view:${roadmapId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable (privacy mode) — record anyway
    }
    recordViewMutation.mutate({ roadmapId });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record one view per roadmapId; the mutation object changes every render
  }, [roadmapId]);

  const recordShareMutation = api.roadmaps.recordShare.useMutation();
  const { copy: copyToClipboard } = useCopyToClipboard();

  const copyMutation = api.roadmaps.copyPublic.useMutation({
    onSuccess: async (_newRoadmap) => {
      await utils.roadmaps.listMine.invalidate();
      toast.success("Roadmap copied to your account!");
      router.push("/roadmaps?view=mine");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to copy roadmap");
      setCopying(false);
    },
  });

  const handleCopy = useCallback(() => {
    setCopying(true);
    copyMutation.mutate({ roadmapId });
  }, [roadmapId, copyMutation]);

  const handleCopyLink = useCallback(async () => {
    const ok = await copyToClipboard(window.location.href, {
      successMessage: "Link copied to clipboard",
      errorMessage: "Failed to copy link",
    });
    if (ok) recordShareMutation.mutate({ roadmapId });
  }, [roadmapId, recordShareMutation, copyToClipboard]);

  const formattedDate = publishedAt ? formatDateSGT(publishedAt) : null;

  return (
    <div className="flex flex-col gap-6">
      <RoadmapsBackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
            {roadmapName}
          </PageTitle>
          {/* Author line: who made this roadmap, their faculty, and when it
              was published */}
          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <User className="size-3" />
              {ownerUsername}
            </span>
            {ownerFaculty && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="size-3" />
                {ownerFaculty.name} ({ownerFaculty.acronym})
              </span>
            )}
            {formattedDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" />
                {formattedDate}
              </span>
            )}
          </p>
          {/* Engagement counts */}
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3" />
              {viewCount} {viewCount === 1 ? "view" : "views"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" />
              {voteCount} {voteCount === 1 ? "upvote" : "upvotes"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Share2 className="size-3" />
              {shareCount} {shareCount === 1 ? "share" : "shares"}
            </span>
          </p>
          {description && (
            <p className="text-muted-foreground mt-2 line-clamp-10 max-w-2xl text-sm whitespace-pre-line">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Vote group + reactions, same UX as reviews */}
          <RoadmapVoteGroup
            roadmapId={roadmapId}
            initialViewerVoteWeight={viewerHasVoted ? 1 : undefined}
          />

          <RoadmapReactionButton roadmapId={roadmapId} />

          {/* Copy public link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Copy link to this roadmap"
                className="h-8 rounded-full"
                onClick={handleCopyLink}
                data-test="roadmap-copy-link"
              >
                <ShareIcon />
                <span className="font-mono">{shareCount}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy link to this roadmap</TooltipContent>
          </Tooltip>

          <ReportButton
            surface="roadmap"
            refId={roadmapId}
            ownerUsername={ownerUsername}
          />

          {/* View mode toggle */}
          <RoadmapViewModeToggle value={viewMode} onValueChange={setViewMode} />

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={copying}
          >
            {copying ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Copy className="mr-1.5 size-4" />
            )}
            Copy this roadmap
          </Button>
        </div>
      </div>

      {/* Reactions, same UX as reviews */}
      <RoadmapReactionsGroup roadmapId={roadmapId} />

      {/* View */}
      <ReadOnlyRoadmapBody
        roadmapId={roadmapId}
        entries={entries}
        viewMode={viewMode}
      />
    </div>
  );
}
