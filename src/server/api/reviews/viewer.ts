import { isDataPublic } from "@/server/ecfg/public-data";
import type { ReviewViewer } from "./service";

/**
 * The viewer an anonymous review read runs as. Its procedure has already
 * checked `reviews`; reviews that name a professor also need `professors`.
 */
export async function publicReviewViewer(): Promise<
  Extract<ReviewViewer, { kind: "public" }>
> {
  return {
    kind: "public",
    courseReviewsOnly: !(await isDataPublic("professors")),
  };
}

/** A signed-in caller reads as a member; anyone else as a public viewer. */
export async function reviewViewerFor(
  session: { user?: { id: string } } | null,
): Promise<ReviewViewer> {
  if (session?.user) return { kind: "member", userId: session.user.id };
  return publicReviewViewer();
}
