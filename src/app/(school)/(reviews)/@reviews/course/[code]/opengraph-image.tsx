import { ImageResponse } from "next/og";
import React from "react";

import { BooksIcon } from "@/common/components/icons";
import { OG_IMAGE_HEADERS } from "@/modules/opengraph/constants";
import { OgImage } from "@/modules/opengraph/components/OgImage";
import {
  toOgRating,
  toOgStatItems,
} from "@/modules/opengraph/functions/ogFigures";
import { getCoursePageData } from "@/modules/reviews/functions/getCoursePageData";
import { isDataPublic } from "@/server/ecfg/public-data";

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

// A static `alt` export cannot depend on the route params, so the preview alt
// is produced here instead. `generateImageMetadata` is Next's supported
// mechanism for param-dependent image metadata (next@16.3.3 bundled docs:
// 01-app/03-api-reference/04-functions/generate-image-metadata.md, and the
// runtime loader next/dist/build/webpack/loaders/next-metadata-image-loader.js
// passes the resolved route params to it). Returning an empty array while the
// parent `[code]` param is unresolved avoids emitting a bogus static param.
export async function generateImageMetadata({
  params,
}: {
  params?: { code?: string };
} = {}) {
  const code = params?.code?.toUpperCase();
  if (!code) return [];

  let alt = `Course ${code} reviews on AfterClass`;
  try {
    const data = await getCoursePageData(code);
    if (data)
      alt = `${data.course.name} (${code}) course reviews on AfterClass`;
  } catch {
    // A lookup failure must not fail the page head; the code-only alt stands.
  }
  return [{ id: "1", size, contentType, alt }];
}

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const courseCode = code.toUpperCase();

  // The figures on the image are course, professor and review data.
  // The CDN caches this image publicly (OG_IMAGE_HEADERS) without keying on
  // cookies, so the gate ignores the session: an image drawn for a signed-in
  // viewer would otherwise be served to anonymous viewers.
  if (!(await isDataPublic("courses", "professors", "reviews"))) {
    return null;
  }

  const data = await getCoursePageData(courseCode);
  if (!data) return null;

  const { course, averageRating, reviewCount, reviewLabels, professorCount } =
    data;

  return new ImageResponse(
    <OgImage>
      <OgImage.Header school="SMU" code={courseCode} />
      <OgImage.Title
        icon={
          <BooksIcon
            size="2.25rem"
            style={{
              color: "#7A7A85",
            }}
          />
        }
      >
        {course.name}
      </OgImage.Title>
      <OgImage.Content
        rating={toOgRating(averageRating, reviewCount)}
        reviewCount={reviewCount}
        profCount={professorCount}
        statItems={toOgStatItems(reviewLabels, reviewCount)}
      />
    </OgImage>,
    {
      ...size,
      headers: OG_IMAGE_HEADERS,
    },
  );
}
