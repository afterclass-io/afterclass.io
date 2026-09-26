import { JsonLd } from "@/common/components/json-ld";
import { buildWebSiteJsonLd } from "@/common/tools/seo";
import { api, HydrateClient } from "@/common/tools/trpc/server";
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
import { parseReviewParams } from "@/modules/reviews/functions/parseReviewParams";
import { auth } from "@/server/auth";

export default async function Home(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [searchParams, session] = await Promise.all([
    props.searchParams,
    auth(),
  ]);
  const isAuthenticated = !!session?.user;
  const { filterFor, sortBy } = parseReviewParams(searchParams);

  // Prefetch under the session-resolved procedure so the hydrated key is the
  // one the client hook reads after hydration.
  await (isAuthenticated
    ? api.reviews.getAllProtected.prefetchInfinite({ filterFor, sortBy })
    : api.reviews.getAll.prefetchInfinite({ filterFor, sortBy }));

  return (
    <>
      <JsonLd data={buildWebSiteJsonLd({ siteUrl: env.NEXTAUTH_URL })} />
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <HydrateClient>
            <ReviewItemLoader
              variant="home"
              isAuthenticated={isAuthenticated}
            />
          </HydrateClient>
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </>
  );
}
