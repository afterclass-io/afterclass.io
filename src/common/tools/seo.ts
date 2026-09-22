import type { MetadataRoute } from "next";

import { DEFAULT_MAX_RATING } from "@/common/components/rating-group.constants";

/** Deployment context as Vercel reports it; unset locally and in CI. */
export type DeploymentEnv = "production" | "preview" | "development";

const DISALLOW = [
  // tRPC, MCP, chat, assistant, cron and the /api/ical/[token] bearer
  // capability URLs all live under /api/.
  "/api/",
  "/.well-known/",
  "/account/auth/",
  "/submit",
  "/search",
];

/** Absolute sitemap entry from a site-relative path. */
const abs = (baseUrl: string, path: string) =>
  new URL(path, baseUrl).toString();

export function buildRobots(
  baseUrl: string,
  vercelEnv?: DeploymentEnv,
): MetadataRoute.Robots {
  // A preview host must not compete with production in the index. Local, CI
  // and production keep the full rules so the disallow list stays observable
  // off a real preview deployment.
  if (vercelEnv === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: DISALLOW },
    sitemap: abs(baseUrl, "/sitemap.xml"),
  };
}

export type SitemapSources = {
  courses: { code: string }[];
  professors: { slug: string }[];
  roadmaps: { id: string }[];
};

export function buildSitemap(
  baseUrl: string,
  { courses, professors, roadmaps }: SitemapSources,
): MetadataRoute.Sitemap {
  // A single sitemap holds at most 50,000 URLs; split into a sitemap index
  // before the catalogue reaches that, not after.
  return [
    { url: abs(baseUrl, "/") },
    { url: abs(baseUrl, "/privacy") },
    { url: abs(baseUrl, "/terms") },
    { url: abs(baseUrl, "/bidding") },
    { url: abs(baseUrl, "/roadmaps") },
    ...courses.map((course) => ({
      url: abs(baseUrl, `/course/${course.code}`),
    })),
    ...professors.map((prof) => ({
      url: abs(baseUrl, `/professor/${prof.slug}`),
    })),
    ...roadmaps.map((roadmap) => ({
      url: abs(baseUrl, `/roadmaps/${roadmap.id}`),
    })),
  ];
}

/**
 * Follow a cursor-paginated procedure to exhaustion. `listPublic` returns at
 * most `limit` items plus a `nextCursor`; the sitemap needs the whole set.
 */
export async function drainCursorPages<T>(
  fetchPage: (
    cursor: string | undefined,
  ) => Promise<{ items: T[]; nextCursor: string | null }>,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await fetchPage(cursor);
    items.push(...page.items);
    if (!page.nextCursor) return items;
    cursor = page.nextCursor;
  }
}

/** A JSON-LD document, plain enough for `JSON.stringify` and a script tag. */
export type JsonLdDocument = Record<string, unknown>;

/**
 * The one branch that needs a test, not a type-check: with no reviews the
 * rating is omitted entirely. A zero is below the declared minimum, invalid
 * against the vocabulary, and would drop the whole rich result - an unrated
 * record must not be presented as a badly rated one.
 */
function buildAggregateRating(
  averageRating: number,
  reviewCount: number,
): JsonLdDocument | undefined {
  if (reviewCount <= 0) return undefined;
  return {
    "@type": "AggregateRating",
    // Google renders this value verbatim; keep the float to two decimals.
    ratingValue: Math.round(averageRating * 100) / 100,
    reviewCount,
    // Declared, never inferred: the scale comes from the rating input so a
    // value out of five cannot be read as a value out of ten.
    bestRating: DEFAULT_MAX_RATING,
    worstRating: 1,
  };
}

export function buildCourseJsonLd({
  siteUrl,
  name,
  description,
  code,
  averageRating,
  reviewCount,
}: {
  siteUrl: string;
  name: string;
  description: string;
  code: string;
  averageRating: number;
  reviewCount: number;
}): JsonLdDocument {
  const aggregateRating = buildAggregateRating(averageRating, reviewCount);

  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    // Required alongside `name` and `provider` for the Course rich result.
    description,
    courseCode: code,
    url: abs(siteUrl, `/course/${code}`),
    provider: {
      "@type": "Organization",
      name: "AfterClass",
      url: abs(siteUrl, "/"),
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildPersonJsonLd({
  siteUrl,
  name,
  slug,
  averageRating,
  reviewCount,
}: {
  siteUrl: string;
  name: string;
  slug: string;
  averageRating: number;
  reviewCount: number;
}): JsonLdDocument {
  const aggregateRating = buildAggregateRating(averageRating, reviewCount);

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: abs(siteUrl, `/professor/${slug}`),
    ...(aggregateRating ? { aggregateRating } : {}),
  };
}

export function buildBreadcrumbJsonLd({
  siteUrl,
  name,
  path,
}: {
  siteUrl: string;
  name: string;
  path: string;
}): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: abs(siteUrl, "/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name,
        item: abs(siteUrl, path),
      },
    ],
  };
}

export function buildWebSiteJsonLd({
  siteUrl,
}: {
  siteUrl: string;
}): JsonLdDocument {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AfterClass",
    url: abs(siteUrl, "/"),
    potentialAction: {
      "@type": "SearchAction",
      target: abs(siteUrl, "/search?q={search_term_string}"),
      "query-input": "required name=search_term_string",
    },
  };
}
