import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { api, HydrateClient } from "@/common/tools/trpc/server";
import { auth } from "@/server/auth";
import { ProfessorStructuredData, buildEntityMetadata } from "@/modules/seo";
import {
  ReviewSection,
  ReviewSectionHeader,
  ReviewSectionList,
  ReviewSectionListFilter,
  ReviewSectionHeaderSortGroup,
} from "@/modules/reviews/components/ReviewSection";
import { ReviewItemLoader } from "@/modules/reviews/components/ReviewItemLoader";
import { ReviewModalFocused } from "@/modules/reviews/components/ReviewModalFocused";
import {
  getReviewFeedParams,
  getReviewFeedProcedure,
} from "@/modules/reviews/functions/reviewFeed";

// Exactly one slot may own metadata for this route (@reviews). Metadata items merge in traversal order and the last writer wins; splitting tags across multiple slots causes non-deterministic overriding.

const getCachedProfessor = cache(async (slug: string) => {
  return api.professors.getBySlug({ slug });
});

const getCachedProfessorMetadata = cache(async (slug: string) => {
  return api.reviews.getMetadataForProf({ slug });
});

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;

  try {
    const prof = await getCachedProfessor(slug);
    if (!prof) {
      return { title: "Professor Not Found" };
    }

    const { averageRating, reviewCount } =
      await getCachedProfessorMetadata(slug);

    return buildEntityMetadata({
      title: prof.name,
      description: `${prof.name} has ${reviewCount} reviews with an average rating of ${averageRating.toFixed(1)}/5 on AfterClass.`,
      canonicalPath: `/professor/${prof.slug}`,
    });
  } catch {
    return { title: "Professor Not Found" };
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
  const prof = await getCachedProfessor(params.slug);
  if (!prof) {
    notFound();
  }
  const metadata = await getCachedProfessorMetadata(params.slug);
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams.course)
      ? searchParams.course
      : [searchParams.course];
  }

  // Resolve the session on the server and prefetch the procedure the client
  // will actually use for this session state, so hydration hits the same
  // query key and signed-in students fetch once, not twice (#516).
  const session = await auth();
  const isAuthed = !!session;
  const { filterFor, sortBy } = getReviewFeedParams(searchParams);
  const procedure = getReviewFeedProcedure("professor", isAuthed);
  await api.reviews[procedure].prefetchInfinite({
    slug: params.slug,
    courseCodes: courseCodes.length > 0 ? courseCodes : undefined,
    filterFor,
    sortBy,
  });

  return (
    <HydrateClient>
      <ProfessorStructuredData
        name={prof.name}
        slug={prof.slug}
        averageRating={metadata.averageRating}
        reviewCount={metadata.reviewCount}
      />
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
            isAuthed={isAuthed}
          />
        </ReviewSectionList>
      </ReviewSection>
      <ReviewModalFocused variant="professor" />
    </HydrateClient>
  );
}
