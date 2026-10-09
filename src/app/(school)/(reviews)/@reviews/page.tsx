import { JsonLd } from "@/common/components/json-ld";
import { buildWebSiteJsonLd } from "@/common/tools/seo";
import { HydrateClient } from "@/common/tools/trpc/server";
import { env } from "@/env";
import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import { prefetchReviewFeed } from "@/modules/reviews/functions/prefetchReviewFeed";
import { auth } from "@/server/auth";

export default async function Home(props: {
  searchParams?: Promise<{
    filter?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  // The session is read here, not in the browser, so the feed is fetched once
  // under the procedure the signed-in or signed-out viewer will keep using.
  const isAuthenticated = Boolean(await auth());
  await prefetchReviewFeed(
    { variant: "home" },
    searchParams ?? {},
    isAuthenticated,
  );

  return (
    <HydrateClient>
      <JsonLd
        data={buildWebSiteJsonLd({ siteUrl: env.NEXT_PUBLIC_SITE_URL })}
      />
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader variant="home" isAuthenticated={isAuthenticated} />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </HydrateClient>
  );
}
