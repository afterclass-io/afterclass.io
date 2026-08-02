"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  LayoutGrid,
  GitBranch,
  Loader2,
  LogIn,
} from "lucide-react";
import { api } from "@/common/tools/trpc/react";
import { RoadmapGrid } from "@/modules/roadmaps/components/RoadmapGrid";
import { RoadmapTimeline } from "@/modules/roadmaps/components/RoadmapTimeline";
import { Button } from "@/common/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { censorProfanity } from "@/common/functions";
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

type ViewMode = "grid" | "timeline";

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
  const noop = useCallback(() => {
    /* read-only — no-op */
  }, []);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const router = useRouter();
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [copying, setCopying] = useState(false);

  const copyMutation = api.sharing.copyShared.useMutation({
    onSuccess: async () => {
      await utils.roadmaps.listMine.invalidate();
      toast.success("Roadmap copied to your account!");
      router.push("/roadmaps/mine");
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
      {/* Back to gallery */}
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
          <Link href="/roadmaps">
            <ArrowLeft className="size-4" />
            All roadmaps
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Shared Roadmap: {censorProfanity(roadmapName)}
          </h1>
          <p className="text-muted-foreground text-sm">
            by {censorProfanity(ownerUsername)}
          </p>
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
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            variant="segmented"
            size="sm"
          >
            <ToggleGroupItem value="grid" aria-label="Grid View">
              <LayoutGrid className="size-4 shrink-0" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="timeline" aria-label="Timeline View">
              <GitBranch className="size-4 shrink-0" />
              <span className="hidden sm:inline">Timeline</span>
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* View */}
      {viewMode === "grid" ? (
        <RoadmapGrid
          roadmapId={roadmapId}
          entries={entries}
          readOnly
          onEntriesChange={noop}
        />
      ) : (
        <RoadmapTimeline entries={entries} readOnly />
      )}
    </div>
  );
}
