import { type Metadata } from "next";

import { JsonLd } from "@/common/components/json-ld";
import { buildBreadcrumbJsonLd, buildPersonJsonLd } from "@/common/tools/seo";
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
import { getProfessorPageData } from "@/modules/reviews/functions/getProfessorPageData";
import { professorDescription } from "@/modules/reviews/functions/pageDescriptions";

// `@reviews` is the single metadata owner for `/professor/[slug]`. Parallel
// slots merge in traversal order and the last writer wins, so do NOT export
// metadata from another slot for this route.
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;

  try {
    const data = await getProfessorPageData(slug);
    if (!data) return { title: "Professor not found" };
    const title = data.professor.name;
    const description = professorDescription(data);
    const canonical = `/professor/${slug}`;
    return {
      title,
      description,
      // `course` and `sort` narrow or reorder a view of this page, so they are
      // dropped: the bare professor URL is the canonical one.
      alternates: { canonical },
      // A node's `openGraph` replaces the accumulated root block wholesale, so
      // the root-owned fields (siteName, type, locale) are re-declared here.
      openGraph: {
        title,
        description,
        siteName: "AfterClass",
        type: "website",
        locale: "en_GB",
        url: canonical,
      },
    };
  } catch {
    return { title: "Professor not found" };
  }
}

export default async function Professor(props: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    course?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course];
  }

  // The same request-scoped, `cache`d query `generateMetadata` runs; the two
  // calls dedupe by function identity and arguments, so this is one query.
  const data = await getProfessorPageData(params.slug);

  return (
    <>
      {data ? (
        <>
          <JsonLd
            data={buildPersonJsonLd({
              siteUrl: env.NEXTAUTH_URL,
              name: data.professor.name,
              slug: params.slug,
              averageRating: data.averageRating,
              reviewCount: data.reviewCount,
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd({
              siteUrl: env.NEXTAUTH_URL,
              name: data.professor.name,
              path: `/professor/${params.slug}`,
            })}
          />
        </>
      ) : null}
      <ReviewSection>
        <ReviewSectionHeader>
          <ReviewSectionHeaderSortGroup />
        </ReviewSectionHeader>
        <ReviewSectionListFilter />
        <ReviewSectionList>
          <ReviewItemLoader
            variant="professor"
            slug={params.slug}
            courseCodes={courseCodes.length > 0 ? courseCodes : undefined}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </>
  );
}
