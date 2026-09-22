import { JsonLd } from "@/common/components/json-ld";
import { buildWebSiteJsonLd } from "@/common/tools/seo";
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

export default function Home() {
  return (
    <>
      <JsonLd data={buildWebSiteJsonLd({ siteUrl: env.NEXTAUTH_URL })} />
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader variant="home" />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="home" />
    </>
  );
}
