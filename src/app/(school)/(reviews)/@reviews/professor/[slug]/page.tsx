import { type Metadata } from "next";

import { AuthWall } from "@/common/components/auth-wall";
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
import { professorDescription } from "@/modules/reviews/functions/pageDescriptions";
import { prefetchReviewFeed } from "@/modules/reviews/functions/prefetchReviewFeed";
import { auth } from "@/server/auth";
import { canViewData } from "@/server/ecfg/public-data";

// Everything the page reads: the professor, their course count and reviews.
const PROFESSOR_PAGE_DOMAINS = ["professors", "courses", "reviews"] as const;

// `@reviews` is the single metadata owner for `/professor/[slug]`. Parallel
// slots merge in traversal order and the last writer wins, so do NOT export
// metadata from another slot for this route.
export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;

  // The title, description and rating figures are all gated data.
  if (!(await canViewData(await auth(), ...PROFESSOR_PAGE_DOMAINS))) {
    return {
      title: "Sign in to view professor reviews",
      robots: { index: false, follow: false },
    };
  }

  try {
    const data = await getProfessorPageData(slug);
    if (!data)
      return {
        title: "Professor not found",
        robots: { index: false, follow: false },
      };
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
    return {
      title: "Professor not found",
      robots: { index: false, follow: false },
    };
  }
}

export default async function Professor(props: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{
    course?: string | string[];
    filter?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await auth();
  // `@header` shows the wall when `professors` itself is private.
  if (!(await canViewData(session, "professors"))) return null;
  if (!(await canViewData(session, ...PROFESSOR_PAGE_DOMAINS))) {
    return <AuthWall variant="full" feature="professor reviews" />;
  }

  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course];
  }

  // The same request-scoped, `cache`d query `generateMetadata` runs; the two
  // calls dedupe by function identity and arguments, so this is one query.
  // The session is read here, not in the browser, so the feed is fetched once
  // under the procedure the signed-in or signed-out viewer will keep using.
  const isAuthenticated = Boolean(session);
  const professorCourseCodes = courseCodes.length > 0 ? courseCodes : undefined;
  const [data] = await Promise.all([
    getProfessorPageData(params.slug),
    prefetchReviewFeed(
      {
        variant: "professor",
        slug: params.slug,
        courseCodes: professorCourseCodes,
      },
      searchParams ?? {},
      isAuthenticated,
    ),
  ]);

  return (
    <HydrateClient>
      {data ? (
        <>
          <JsonLd
            data={buildPersonJsonLd({
              siteUrl: env.NEXT_PUBLIC_SITE_URL,
              name: data.professor.name,
              slug: params.slug,
              averageRating: data.averageRating,
              reviewCount: data.reviewCount,
            })}
          />
          <JsonLd
            data={buildBreadcrumbJsonLd({
              siteUrl: env.NEXT_PUBLIC_SITE_URL,
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
            courseCodes={professorCourseCodes}
            isAuthenticated={isAuthenticated}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </HydrateClient>
  );
}
