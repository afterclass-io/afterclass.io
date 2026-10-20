import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthWall } from "@/common/components/auth-wall";
import { ConstrainedContainer } from "@/common/components/constrained-container";
import { auth } from "@/server/auth";
import { canViewData, isDataPublic } from "@/server/ecfg/public-data";
import { RoadmapsExplorer } from "@/modules/roadmaps/components/RoadmapsExplorer";

// `view` selects which tab is shown, so it is dropped from the canonical.
// Anonymous viewers only ever see the public explorer, so the page is
// noindexed while `publicRoadmaps` is private.
export async function generateMetadata(): Promise<Metadata> {
  const indexable = await isDataPublic("publicRoadmaps");
  return {
    alternates: { canonical: "/roadmaps" },
    ...(!indexable && { robots: { index: false, follow: false } }),
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

// No `loading.tsx` on this route, on purpose (#523). The page awaits only the
// session read, and the roadmap lists load in the browser. A boundary above the
// `view=mine` gate would start the response first, so the anonymous redirect
// would turn from an HTTP redirect into a client redirect.
export default async function RoadmapsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { view } = await searchParams;
  const session = await auth();

  // Gate the "My roadmaps" view behind auth.
  if (view === "mine" && !session) {
    redirect(
      `/account/auth/login?callbackUrl=${encodeURIComponent("/roadmaps?view=mine")}`,
    );
  }

  if (!(await canViewData(session, "publicRoadmaps"))) {
    return (
      <ConstrainedContainer>
        <AuthWall variant="full" feature="public roadmaps" />
      </ConstrainedContainer>
    );
  }

  return (
    <RoadmapsExplorer
      initialView={view === "mine" ? "mine" : "public"}
      isLoggedIn={!!session}
    />
  );
}
