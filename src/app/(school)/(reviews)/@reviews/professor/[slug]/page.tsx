import { cache } from "react";
import type { Metadata } from "next";

import { api } from "@/common/tools/trpc/server";
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
import {
  JsonLd,
  createProfessorJsonLd,
  createBreadcrumbJsonLd,
} from "@/common/components/json-ld";

// CONSTRAINT (SEO): Exactly one parallel-route slot may own metadata for this route (@reviews).

const getProfData = cache(async (slug: string) => {
  const prof = await api.professors.getBySlug({ slug });
  if (!prof) return null;
  const reviewMetadata = await api.reviews
    .getMetadataForProf({ slug })
    .catch(() => null);
  return {
    prof,
    reviewMetadata: reviewMetadata ?? {
      averageRating: 0,
      reviewCount: 0,
      reviewLabels: [],
    },
  };
});

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  if (!slug) {
    return { title: "Professor Not Found" };
  }

  try {
    const data = await getProfData(slug);
    if (!data?.prof) {
      return { title: "Professor Not Found" };
    }

    const { prof, reviewMetadata } = data;
    const title = prof.name;
    const reviewCount = reviewMetadata.reviewCount;
    const description =
      reviewCount > 0
        ? `Read ${reviewCount} review${reviewCount === 1 ? "" : "s"} for ${prof.name} with an average rating of ${reviewMetadata.averageRating.toFixed(2)}/5.`
        : `Read reviews and ratings for ${prof.name} at AfterClass.`;

    return {
      title,
      description,
      alternates: {
        canonical: `/professor/${slug}`,
      },
      openGraph: {
        title,
        description,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Professor Not Found" };
  }
}

export default async function Professor(
  props: {
    params: Promise<{ slug: string }>;
    searchParams?: Promise<{
      course?: string | string[];
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  let courseCodes: string[] = [];
  if (searchParams?.course) {
    courseCodes = Array.isArray(searchParams?.course)
      ? searchParams?.course
      : [searchParams?.course];
  }

  const data = await getProfData(params.slug);
  const baseUrl = (env.NEXT_PUBLIC_SITE_URL ?? "https://afterclass.io").replace(/\/$/, "");

  const personJsonLd = data?.prof
    ? createProfessorJsonLd(data.prof, data.reviewMetadata, baseUrl)
    : null;
  const breadcrumbsJsonLd = data?.prof
    ? createBreadcrumbJsonLd([
        { name: "Home", url: `${baseUrl}/` },
        { name: data.prof.name, url: `${baseUrl}/professor/${data.prof.slug}` },
      ])
    : null;

  return (
    <>
      {personJsonLd && <JsonLd data={personJsonLd} />}
      {breadcrumbsJsonLd && <JsonLd data={breadcrumbsJsonLd} />}
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
