import { redirect } from "next/navigation";

import { auth } from "@/server/auth";
import { RoadmapsExplorer } from "@/modules/roadmaps/components/RoadmapsExplorer";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

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

  return (
    <RoadmapsExplorer
      initialView={view === "mine" ? "mine" : "public"}
      isLoggedIn={!!session}
    />
  );
}
