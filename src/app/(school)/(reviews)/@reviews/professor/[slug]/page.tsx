import { type Metadata } from "next";

import { JsonLd } from "@/common/components/json-ld";
import { buildBreadcrumbJsonLd, buildPersonJsonLd } from "@/common/tools/seo";
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
import { getProfessorPageData } from "@/modules/reviews/functions/getProfessorPageData";
import { parseReviewParams } from "@/modules/reviews/functions/parseReviewParams";
import { prefetchReviewFeed } from "@/modules/reviews/functions/prefetchReviewFeed";
import { professorDescription } from "@/modules/reviews/functions/pageDescriptions";
import { auth } from "@/server/auth";

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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [searchParams, params, session] = await Promise.all([
    props.searchParams,
    props.params,
    auth(),
  ]);
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams.course)
      ? searchParams.course
      : [searchParams.course];
  }
  const { filterFor, sortBy } = parseReviewParams(searchParams);
  const isAuthenticated = !!session?.user;

  // The same request-scoped, `cache`d query `generateMetadata` runs; the two
  // calls dedupe by function identity and arguments, so this is one query.
  const [data] = await Promise.all([
    getProfessorPageData(params.slug),
    prefetchReviewFeed({
      variant: "professor",
      isAuthenticated,
      slug: params.slug,
      courseCodes: courseCodes.length > 0 ? courseCodes : undefined,
      filterFor,
      sortBy,
    }),
  ]);

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
          <HydrateClient>
            <ReviewItemLoader
              variant="professor"
              slug={params.slug}
              courseCodes={courseCodes.length > 0 ? courseCodes : undefined}
              isAuthenticated={isAuthenticated}
            />
          </HydrateClient>
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </>
  );
}
