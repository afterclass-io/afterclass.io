"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Copy, Loader2, LogIn } from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import {
  ReadOnlyRoadmapBody,
  RoadmapViewModeToggle,
  RoadmapsBackLink,
  type RoadmapViewMode,
} from "@/modules/roadmaps/components/ReadOnlyRoadmapBody";
import { ReportButton } from "@/modules/moderation/components/ReportButton";
import { Button } from "@/common/components/button";
import { PageTitle } from "@/common/components/page-title";
import type { Entry } from "@/modules/roadmaps/functions/conflicts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SharedRoadmapViewProps = {
  roadmapId: string;
  roadmapName: string;
  ownerUsername: string;
  entries: Entry[];
  /** Share token — lets the recipient copy the roadmap into their account. */
  token: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SharedRoadmapView({
  roadmapId,
  roadmapName,
  ownerUsername,
  entries,
  token,
}: SharedRoadmapViewProps) {
  const [viewMode, setViewMode] = useState<RoadmapViewMode>("grid");

  const router = useRouter();
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [copying, setCopying] = useState(false);

  const copyMutation = api.sharing.copyShared.useMutation({
    onSuccess: async () => {
      await utils.roadmaps.listMine.invalidate();
      toast.success("Roadmap copied to your account!");
      router.push("/roadmaps?view=mine");
      setCopying(false);
    },
    onError: () => {
      toast.error("Failed to copy roadmap");
      setCopying(false);
    },
  });

  const handleCopy = useCallback(() => {
    setCopying(true);
    copyMutation.mutate({ token });
  }, [token, copyMutation]);

  // Guests must log in before a roadmap can be copied into their account.
  const loginHref = `/account/auth/login?callbackUrl=${encodeURIComponent(
    `/share/roadmap/${token}`,
  )}`;

  return (
    <div className="flex flex-col gap-6">
      <RoadmapsBackLink />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle className="text-left text-2xl font-bold tracking-tight md:text-2xl!">
            Shared Roadmap: {roadmapName}
          </PageTitle>
          <p className="text-muted-foreground text-sm">by {ownerUsername}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Copy into the viewer's account (works for private shares too) */}
          {session?.user ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={copying}
              data-test="shared-roadmap-copy"
            >
              {copying ? (
                <Loader2 className="mr-1.5 size-4 animate-spin" />
              ) : (
                <Copy className="mr-1.5 size-4" />
              )}
              Copy this roadmap
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href={loginHref}>
                <LogIn className="mr-1.5 size-4" />
                Log in to copy
              </Link>
            </Button>
          )}

          {/* View mode toggle */}
          <RoadmapViewModeToggle value={viewMode} onValueChange={setViewMode} />

          <ReportButton
            surface="roadmap"
            refId={roadmapId}
            ownerUsername={ownerUsername}
          />
        </div>
      </div>

      {/* View */}
      <ReadOnlyRoadmapBody
        roadmapId={roadmapId}
        entries={entries}
        viewMode={viewMode}
      />
    </div>
  );
}
