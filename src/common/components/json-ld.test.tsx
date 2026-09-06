import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://afterclass.io",
  },
}));

import {
  sanitizeJsonLd,
  JsonLd,
  createCourseJsonLd,
  createProfessorJsonLd,
  createBreadcrumbJsonLd,
  createWebSiteJsonLd,
} from "./json-ld";

describe("sanitizeJsonLd", () => {
  it("sanitizes HTML-breaking characters (<, >, &) to prevent XSS and script tag injection", () => {
    const maliciousPayload = {
      title: "Introduction to CS</script><script>alert('xss')</script>",
      description: "Learn C++ & Algorithms > Beginners",
    };

    const sanitized = sanitizeJsonLd(maliciousPayload);

    // Verify raw HTML-breaking characters are absent
    expect(sanitized).not.toContain("<");
    expect(sanitized).not.toContain(">");
    expect(sanitized).not.toContain("&");

    // Verify escape sequences are present
    expect(sanitized).toContain("\\u003c");
    expect(sanitized).toContain("\\u003e");
    expect(sanitized).toContain("\\u0026");

    // Verify standard JSON parsers decode back to the exact original characters
    const parsed: unknown = JSON.parse(sanitized);
    expect(parsed).toEqual(maliciousPayload);
  });

  it("handles undefined gracefully without throwing", () => {
    expect(sanitizeJsonLd(undefined)).toBe("{}");
  });

  it("escapes line separators U+2028 and U+2029", () => {
    const text = { text: "line1\u2028line2\u2029line3" };
    const sanitized = sanitizeJsonLd(text);
    expect(sanitized).toContain("\\u2028");
    expect(sanitized).toContain("\\u2029");
  });
});

describe("JsonLd Component", () => {
  it("renders a script tag with type application/ld+json and sanitized innerHTML", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AfterClass <Test & Demo>",
    };

    const html = renderToStaticMarkup(<JsonLd data={data} />);

    expect(html).toContain('type="application/ld+json"');
    expect(html).not.toContain("<Test");
    expect(html).toContain("\\u003cTest");
    expect(html).toContain("\\u0026");

    const match = /<script[^>]*>([\s\S]*?)<\/script>/.exec(html);
    expect(match).not.toBeNull();
    const parsed: unknown = JSON.parse(match?.[1] ?? "{}");
    expect(parsed).toEqual(data);
  });
});

describe("createCourseJsonLd", () => {
  const courseFixture = {
    name: "Digital Business - Technologies and Transformation",
    code: "IS215",
    description: "Course about digital transformation.",
    belongToUniversity: {
      name: "Singapore Management University",
      siteUrl: "https://www.smu.edu.sg/",
    },
  };

  it("includes aggregateRating when reviewCount > 0", () => {
    const reviewMetadata = {
      averageRating: 4.11111,
      reviewCount: 9,
    };

    const jsonLd = createCourseJsonLd(courseFixture, reviewMetadata);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Course");
    expect(jsonLd.name).toBe("Digital Business - Technologies and Transformation");
    expect(jsonLd.courseCode).toBe("IS215");
    expect(jsonLd.provider).toEqual({
      "@type": "Organization",
      name: "Singapore Management University",
      sameAs: "https://www.smu.edu.sg/",
    });

    expect(jsonLd.aggregateRating).toBeDefined();
    expect(jsonLd.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.11,
      bestRating: "5",
      worstRating: "1",
      ratingCount: 9,
    });
  });

  it("omits aggregateRating entirely when reviewCount == 0", () => {
    const reviewMetadata = {
      averageRating: 0,
      reviewCount: 0,
    };

    const jsonLd = createCourseJsonLd(courseFixture, reviewMetadata);

    expect(jsonLd["@type"]).toBe("Course");
    // Tautological Test Prevention: Unconditional assertion
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect("aggregateRating" in jsonLd).toBe(false);
  });

  it("omits aggregateRating entirely when reviewMetadata is null or undefined", () => {
    const jsonLd = createCourseJsonLd(courseFixture, null);

    expect(jsonLd["@type"]).toBe("Course");
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect("aggregateRating" in jsonLd).toBe(false);
  });
});

describe("createProfessorJsonLd", () => {
  const profFixture = {
    name: "Ouh Eng Lieh",
    slug: "ouh-eng-lieh",
  };

  it("includes aggregateRating when reviewCount > 0", () => {
    const reviewMetadata = {
      averageRating: 4.25,
      reviewCount: 20,
    };

    const jsonLd = createProfessorJsonLd(profFixture, reviewMetadata);

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("Person");
    expect(jsonLd.name).toBe("Ouh Eng Lieh");
    expect(jsonLd.jobTitle).toBe("Professor");

    expect(jsonLd.aggregateRating).toBeDefined();
    expect(jsonLd.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.25,
      bestRating: "5",
      worstRating: "1",
      ratingCount: 20,
    });
  });

  it("omits aggregateRating entirely when reviewCount == 0", () => {
    const reviewMetadata = {
      averageRating: 0,
      reviewCount: 0,
    };

    const jsonLd = createProfessorJsonLd(profFixture, reviewMetadata);

    expect(jsonLd["@type"]).toBe("Person");
    // Tautological Test Prevention: Unconditional assertion
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect("aggregateRating" in jsonLd).toBe(false);
  });
});

describe("createBreadcrumbJsonLd", () => {
  it("creates valid BreadcrumbList structured data", () => {
    const breadcrumbs = createBreadcrumbJsonLd([
      { name: "Home", url: "https://afterclass.io/" },
      { name: "IS215", url: "https://afterclass.io/course/IS215" },
    ]);

    expect(breadcrumbs).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://afterclass.io/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "IS215",
          item: "https://afterclass.io/course/IS215",
        },
      ],
    });
  });
});

describe("createWebSiteJsonLd", () => {
  it("creates valid WebSite structured data with SearchAction", () => {
    const website = createWebSiteJsonLd("https://afterclass.io");

    expect(website).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "AfterClass",
      url: "https://afterclass.io/",
      potentialAction: {
        "@type": "SearchAction",
        target: "https://afterclass.io/search?q={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    });
  });
});
