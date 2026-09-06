import React from "react";
import { env } from "@/env";

/**
 * Sanitizes JSON-LD output to prevent XSS and script tag injection.
 * Replaces '<', '>', and '&' with unicode escape sequences (\u003c, \u003e, \u0026).
 * Standard JSON parsers (e.g., JSON.parse, search engine crawlers) decode these back to characters.
 */
export function sanitizeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  if (!json) return "{}";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: sanitizeJsonLd(data) }}
    />
  );
}

export interface UniversityProvider {
  name: string;
  siteUrl?: string | null;
}

export interface CourseData {
  name: string;
  code: string;
  description?: string | null;
  belongToUniversity?: UniversityProvider | null;
}

export interface ReviewMetadata {
  averageRating: number;
  reviewCount: number;
}

export interface ProfessorData {
  name: string;
  slug: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function createCourseJsonLd(
  course: CourseData,
  reviewMetadata?: ReviewMetadata | null,
  baseUrl: string = (env.NEXT_PUBLIC_SITE_URL ?? "https://afterclass.io").replace(/\/+$/, ""),
) {
  const reviewCount = reviewMetadata?.reviewCount ?? 0;
  const university = course.belongToUniversity;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.name,
    courseCode: course.code,
    ...(course.description ? { description: course.description } : {}),
    url: `${baseUrl}/course/${course.code}`,
    provider: {
      "@type": "Organization",
      name: university?.name ?? "Singapore Management University",
      ...(university?.siteUrl ? { sameAs: university.siteUrl } : {}),
    },
  };

  if (reviewCount > 0 && reviewMetadata) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(reviewMetadata.averageRating.toFixed(2)),
      bestRating: "5",
      worstRating: "1",
      ratingCount: reviewCount,
    };
  }

  return jsonLd;
}

export function createProfessorJsonLd(
  prof: ProfessorData,
  reviewMetadata?: ReviewMetadata | null,
  baseUrl: string = (env.NEXT_PUBLIC_SITE_URL ?? "https://afterclass.io").replace(/\/+$/, ""),
) {
  const reviewCount = reviewMetadata?.reviewCount ?? 0;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: prof.name,
    jobTitle: "Professor",
    url: `${baseUrl}/professor/${prof.slug}`,
  };

  if (reviewCount > 0 && reviewMetadata) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(reviewMetadata.averageRating.toFixed(2)),
      bestRating: "5",
      worstRating: "1",
      ratingCount: reviewCount,
    };
  }

  return jsonLd;
}

export function createBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function createWebSiteJsonLd(
  baseUrl: string = (env.NEXT_PUBLIC_SITE_URL ?? "https://afterclass.io").replace(/\/+$/, ""),
) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AfterClass",
    url: `${baseUrl}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${baseUrl}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
