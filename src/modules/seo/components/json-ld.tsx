import { env } from "@/env";

export interface RatingSummary {
  averageRating: number;
  reviewCount: number;
}

type JsonLdData = Record<string, unknown> | Array<Record<string, unknown>>;

function safeJsonLdStringify(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(data) }}
    />
  );
}

function createAggregateRating(summary: RatingSummary) {
  if (summary.reviewCount <= 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: summary.averageRating.toFixed(2),
    bestRating: 5,
    worstRating: 1,
    ratingCount: summary.reviewCount,
  };
}

function createBreadcrumbs(baseUrl: string, leafName: string, leafUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: leafName,
        item: leafUrl,
      },
    ],
  };
}

export function CourseStructuredData({
  courseCode,
  courseName,
  courseDescription,
  averageRating,
  reviewCount,
}: {
  courseCode: string;
  courseName: string;
  courseDescription?: string | null;
  averageRating: number;
  reviewCount: number;
}) {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const courseUrl = `${baseUrl}/course/${courseCode}`;
  const aggregateRating = createAggregateRating({ averageRating, reviewCount });

  const courseJson: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${courseCode}: ${courseName}`,
    ...(courseDescription ? { description: courseDescription } : {}),
    url: courseUrl,
    provider: {
      "@type": "Organization",
      name: "Singapore Management University",
      sameAs: "https://www.smu.edu.sg",
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };

  const breadcrumbsJson = createBreadcrumbs(
    baseUrl,
    `${courseCode}: ${courseName}`,
    courseUrl,
  );

  return <JsonLd data={[courseJson, breadcrumbsJson]} />;
}

export function ProfessorStructuredData({
  name,
  slug,
  averageRating,
  reviewCount,
}: {
  name: string;
  slug: string;
  averageRating: number;
  reviewCount: number;
}) {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const profUrl = `${baseUrl}/professor/${slug}`;
  const aggregateRating = createAggregateRating({ averageRating, reviewCount });

  const personJson: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url: profUrl,
    jobTitle: "Professor",
    worksFor: {
      "@type": "CollegeOrUniversity",
      name: "Singapore Management University",
      sameAs: "https://www.smu.edu.sg",
    },
    ...(aggregateRating ? { aggregateRating } : {}),
  };

  const breadcrumbsJson = createBreadcrumbs(baseUrl, name, profUrl);

  return <JsonLd data={[personJson, breadcrumbsJson]} />;
}

export function WebSiteStructuredData() {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  const websiteJson: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "AfterClass",
    url: baseUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <JsonLd data={websiteJson} />;
}
