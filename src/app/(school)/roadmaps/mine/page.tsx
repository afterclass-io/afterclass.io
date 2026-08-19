import { redirect } from "next/navigation";

import { auth } from "@/server/auth";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * @deprecated The editor now lives in the unified /roadmaps page under the
 * "My roadmaps" view. This route only redirects (with a login gate) so old
 * links keep working.
 */
export default async function RoadmapsMineRedirectPage() {
  const session = await auth();
  if (!session) {
    redirect(
      `/account/auth/login?callbackUrl=${encodeURIComponent("/roadmaps?view=mine")}`,
    );
  }
  redirect("/roadmaps?view=mine");
}
