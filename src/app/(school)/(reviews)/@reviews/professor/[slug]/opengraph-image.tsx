import { ImageResponse } from "next/og";
import React from "react";

import PhGraduationCapFill from "~icons/ph/graduation-cap-fill";

import { api } from "@/common/tools/trpc/server";
import { OgImage } from "@/modules/opengraph/components/OgImage";
import { toTitleCase, formatPercentage } from "@/common/functions";

export const runtime = "nodejs";

export const alt = "AfterClass";
export const size = {
  width: 720,
  height: 400,
};

export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const { slug } = params;

  const prof = await api.professors.getBySlug({ slug });
  if (!prof) return null;

  const { averageRating, reviewCount, reviewLabels } =
    await api.reviews.getMetadataForProf({
      slug,
    });
  const courseCount = await api.courses.countByProfSlug({ slug });

  return new ImageResponse(
    (
      <OgImage>
        <OgImage.Header school="SMU" />
        <OgImage.Title
          icon={
            <PhGraduationCapFill
              width="2.25rem"
              height="2.25rem"
              style={{
                color: "#7A7A85",
              }}
            />
          }
        >
          {prof.name}
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
      </OgImage>
    ),
    {
      ...size,
    },
  );
}
