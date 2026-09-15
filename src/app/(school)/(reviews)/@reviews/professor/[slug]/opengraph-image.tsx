import { ImageResponse } from "next/og";
import React from "react";

import { GraduationCapIcon } from "@/common/components/icons";
import { OgImage } from "@/modules/opengraph/components/OgImage";
import { getProfessorPageData } from "@/modules/reviews/functions/getProfessorPageData";
import { toTitleCase, formatPercentage } from "@/common/functions";

export const runtime = "nodejs";

// The data fetch goes through the RSC tRPC caller, which reads `headers()`.
// Without this, exporting `generateImageMetadata` makes Next statically
// prerender the route, and the `headers()` call fails every request with
// DYNAMIC_SERVER_USAGE (500).
export const dynamic = "force-dynamic";

export const size = {
  width: 720,
  height: 400,
};

export const contentType = "image/png";

// Route-specific alt, produced via `generateImageMetadata` because a static
// `alt` export cannot depend on the route params. See the course image for
// the mechanism evidence; an empty array is returned while `[slug]` is
// unresolved so no bogus static param is emitted.
export async function generateImageMetadata({
  params,
}: {
  params?: { slug?: string };
} = {}) {
  const slug = params?.slug;
  if (!slug) return [];

  let alt = `Professor ${slug} reviews on AfterClass`;
  try {
    const data = await getProfessorPageData(slug);
    if (data) alt = `${data.professor.name} professor reviews on AfterClass`;
  } catch {
    // See the course image: a lookup failure must not fail the page head.
  }
  return [{ id: "1", size, contentType, alt }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const data = await getProfessorPageData(slug);
  if (!data) return null;

  const { professor, averageRating, reviewCount, reviewLabels, courseCount } =
    data;

  return new ImageResponse(
    <OgImage>
      <OgImage.Header school="SMU" />
      <OgImage.Title
        icon={
          <GraduationCapIcon
            size="2.25rem"
            style={{
              color: "#7A7A85",
            }}
          />
        }
      >
        {professor.name}
      </OgImage.Title>
      <OgImage.Content
        rating={averageRating.toFixed(2)}
        reviewCount={reviewCount}
        courseCount={courseCount}
        statItems={reviewLabels.map((label) => ({
          label: toTitleCase(label.name),
          value: formatPercentage(label.count && label.count / reviewCount),
        }))}
      />
    </OgImage>,
    {
      ...size,
    },
  );
}
