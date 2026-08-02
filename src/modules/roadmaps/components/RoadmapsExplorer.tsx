"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";

import { Button } from "@/common/components/button";
import { EmptyState } from "@/common/components/empty-state";
import { ToggleGroup, ToggleGroupItem } from "@/common/components/toggle-group";
import { PublicRoadmapsGallery } from "@/modules/roadmaps/components/PublicRoadmapsGallery";
import { MyRoadmapsEditor } from "@/modules/roadmaps/components/MyRoadmapsEditor";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RoadmapsView = "public" | "mine";

export type RoadmapsExplorerProps = {
  initialView: RoadmapsView;
  isLoggedIn: boolean;
};

const LOGIN_CALLBACK = `/account/auth/login?callbackUrl=${encodeURIComponent(
  "/roadmaps?view=mine",
)}`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RoadmapsExplorer({
  initialView,
  isLoggedIn,
}: RoadmapsExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [view, setView] = useState<RoadmapsView>(initialView);

  // Keep the tab in sync with the URL so browser back/forward works.
  useEffect(() => {
    setView(searchParams.get("view") === "mine" ? "mine" : "public");
  }, [searchParams]);

  const handleViewChange = (v: string) => {
    if (!v) return;
    const next = v as RoadmapsView;
    setView(next);
    // Reflect the tab in the URL (?view=mine) so the breadcrumb reads it
    // and back-navigation works. Public is the default → no param.
    router.replace(next === "mine" ? `${pathname}?view=mine` : pathname, {
      scroll: false,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Roadmaps</h1>
          <p className="text-muted-foreground text-sm">
            Plan your degree and explore roadmaps shared by the SMU community.
          </p>
        </div>

        {/* View switcher */}
        <ToggleGroup
          type="single"
          variant="segmented"
          size="sm"
          value={view}
          onValueChange={handleViewChange}
        >
          <ToggleGroupItem value="public" aria-label="Public roadmaps">
            Public roadmaps
          </ToggleGroupItem>
          <ToggleGroupItem value="mine" aria-label="My roadmaps">
            My roadmaps
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "public" ? (
        <PublicRoadmapsGallery />
      ) : isLoggedIn ? (
        <MyRoadmapsEditor />
      ) : (
        <EmptyState
          className="py-16"
          icon={<LogIn />}
          title="Log in to see your roadmaps"
          description="You must be logged in to create and manage roadmaps."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={LOGIN_CALLBACK}>Log in</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
