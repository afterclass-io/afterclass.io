import { describe, expect, it, vi } from "vitest";

import { DEFAULT_MAX_RATING } from "@/common/components/rating-group.constants";

import {
  buildBreadcrumbJsonLd,
  buildCourseJsonLd,
  buildPersonJsonLd,
  buildRobots,
  buildSitemap,
  buildWebSiteJsonLd,
  drainCursorPages,
} from "./seo";

const BASE = "https://afterclass.io";

const FULL_DISALLOW = [
  "/api/",
  "/.well-known/",
  "/account/auth/",
  "/submit",
  "/search",
];

function disallowLines(robots: ReturnType<typeof buildRobots>): string[] {
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  return rules.flatMap((rule) => {
    const disallow = rule.disallow;
    if (disallow === undefined) return [];
    return Array.isArray(disallow) ? disallow : [disallow];
  });
}

describe("buildRobots", () => {
  it("blanket-disallows a preview deployment", () => {
    const robots = buildRobots(BASE, "preview");
    expect(disallowLines(robots)).toEqual(["/"]);
    expect(robots.sitemap).toBeUndefined();
  });

  it("emits the full rules and sitemap when VERCEL_ENV is unset (local/CI)", () => {
    const robots = buildRobots(BASE, undefined);
    expect(disallowLines(robots)).toEqual(FULL_DISALLOW);
    expect(robots.sitemap).toBe(`${BASE}/sitemap.xml`);
  });

  it("emits the full rules on production and development", () => {
    for (const env of ["production", "development"] as const) {
      expect(disallowLines(buildRobots(BASE, env))).toEqual(FULL_DISALLOW);
    }
  });
});

describe("buildSitemap", () => {
  it("builds absolute course, professor, roadmap and static URLs", () => {
    const urls = buildSitemap(BASE, {
      courses: [{ code: "IS215" }],
      professors: [{ slug: "ouh-eng-lieh" }],
      roadmaps: [{ id: "roadmap-002-user-a" }],
    }).map((entry) => entry.url);

    expect(urls).toContain(`${BASE}/course/IS215`);
    expect(urls).toContain(`${BASE}/professor/ouh-eng-lieh`);
    expect(urls).toContain(`${BASE}/roadmaps/roadmap-002-user-a`);
    expect(urls).toContain(`${BASE}/`);
    expect(urls).toContain(`${BASE}/privacy`);
    expect(urls).toContain(`${BASE}/terms`);
    expect(urls).toContain(`${BASE}/bidding`);
    expect(urls).toContain(`${BASE}/roadmaps`);
  });
});

describe("drainCursorPages", () => {
  it("accumulates every page and stops when the cursor is exhausted", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ items: ["a"], nextCursor: "c2" })
      .mockResolvedValueOnce({ items: ["b"], nextCursor: "c3" })
      .mockResolvedValueOnce({ items: ["c"], nextCursor: null });

    await expect(drainCursorPages(fetchPage)).resolves.toEqual(["a", "b", "c"]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "c2");
    expect(fetchPage).toHaveBeenNthCalledWith(3, "c3");
  });

  it("makes a single call when the first page has no next cursor", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null });
    await expect(drainCursorPages(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

// The zero-review branch is the one that must not be inferred from the types:
// an omitted rating and a present-but-zero rating have the same type, and only
// the former is valid against the vocabulary.
describe("buildCourseJsonLd", () => {
  it("omits aggregateRating for a course with no reviews", () => {
    const course = buildCourseJsonLd({
      siteUrl: BASE,
      name: "Management and Leadership: A Seminar with CEOs",
      code: "MGMT214",
      averageRating: 0,
      reviewCount: 0,
    });

    expect(course).not.toHaveProperty("aggregateRating");
    expect(course["@type"]).toBe("Course");
    expect(course.courseCode).toBe("MGMT214");
  });

  it("declares the scale and count when the course has reviews", () => {
    const course = buildCourseJsonLd({
      siteUrl: BASE,
      name: "Digital Business - Technologies and Transformation",
      code: "IS215",
      // A DB average can be a long float; the emitted value must not be.
      averageRating: 4.111111111111,
      reviewCount: 9,
    });

    expect(course.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.11,
      reviewCount: 9,
      bestRating: DEFAULT_MAX_RATING,
      worstRating: 1,
    });
  });
});

describe("buildPersonJsonLd", () => {
  it("omits aggregateRating for a professor with no reviews", () => {
    const person = buildPersonJsonLd({
      siteUrl: BASE,
      name: "Unrated Professor",
      slug: "unrated-professor",
      averageRating: 0,
      reviewCount: 0,
    });

    expect(person).not.toHaveProperty("aggregateRating");
    expect(person["@type"]).toBe("Person");
  });

  it("carries the declared rating scale when the professor has reviews", () => {
    const person = buildPersonJsonLd({
      siteUrl: BASE,
      name: "OUH Eng Lieh",
      slug: "ouh-eng-lieh",
      averageRating: 4.25,
      reviewCount: 20,
    });

    expect(person.aggregateRating).toMatchObject({
      reviewCount: 20,
      bestRating: DEFAULT_MAX_RATING,
      worstRating: 1,
    });
    expect(person.url).toBe(`${BASE}/professor/ouh-eng-lieh`);
  });
});

describe("buildBreadcrumbJsonLd", () => {
  it("trails Home then the named record, in order and absolute", () => {
    const breadcrumb = buildBreadcrumbJsonLd({
      siteUrl: BASE,
      name: "Digital Business",
      path: "/course/IS215",
    });

    expect(breadcrumb["@type"]).toBe("BreadcrumbList");
    expect(breadcrumb.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Digital Business",
        item: `${BASE}/course/IS215`,
      },
    ]);
  });
});

describe("buildWebSiteJsonLd", () => {
  it("emits a WebSite whose search action carries the required query-input", () => {
    const site = buildWebSiteJsonLd({ siteUrl: BASE });

    expect(site).toMatchObject({
      "@type": "WebSite",
      name: "AfterClass",
      url: `${BASE}/`,
    });
    expect(site.potentialAction).toEqual({
      "@type": "SearchAction",
      target: `${BASE}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    });
  });
});
