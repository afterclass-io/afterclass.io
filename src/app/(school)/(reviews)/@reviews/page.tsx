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

// Exactly one slot may own metadata for this route (@reviews). Metadata items merge in traversal order and the last writer wins; splitting tags across multiple slots causes non-deterministic overriding.
export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <>
      <WebSiteStructuredData />
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
