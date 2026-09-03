import type { Metadata } from "next";
import { WebSiteStructuredData } from "@/modules/seo";
import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { api, HydrateClient } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import {
  getReviewFeedParams,
  getReviewFeedProcedure,
} from "@/modules/reviews/functions/reviewFeed";

// Exactly one slot may own metadata for this route (@reviews). Metadata items merge in traversal order and the last writer wins; splitting tags across multiple slots causes non-deterministic overriding.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default async function Home(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const session = await auth();
  // Resolve the session on the server and prefetch the procedure the client
  // will actually use for this session state, so hydration hits the same
  // query key and signed-in students fetch once, not twice (#516).
  const isAuthed = !!session;
  const { filterFor, sortBy } = getReviewFeedParams(searchParams);
  const procedure = getReviewFeedProcedure("home", isAuthed);
  await api.reviews[procedure].prefetchInfinite({ filterFor, sortBy });

  return (
    <HydrateClient>
      <WebSiteStructuredData />
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader variant="home" isAuthed={isAuthed} />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </HydrateClient>
  );
}
