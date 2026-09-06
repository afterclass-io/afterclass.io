/// <reference types="cypress" />

describe("SEO: Page Head Metadata", () => {
  const TEST_CASES = [
    {
      name: "Root /",
      url: "/",
      assertHead: (html) => {
        expect(html).to.match(/<title>[^<]*AfterClass[^<]*<\/title>/i);
        expect(html).to.match(
          /<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i,
        );
        expect(html).to.match(
          /<meta[^>]*property=["']og:image["'][^>]*content=["'][^"']+["']/i,
        );
        expect(html).to.match(
          /<meta[^>]*property=["']og:url["'][^>]*content=["'][^"']+["']/i,
        );
        expect(html).to.match(
          /<meta[^>]*property=["']og:locale["'][^>]*content=["']en_SG["']/i,
        );
        expect(html).to.match(
          /<meta[^>]*name=["']twitter:card["'][^>]*content=["']summary_large_image["']/i,
        );
      },
    },
    {
      name: "Course /course/IS215",
      url: "/course/IS215",
      assertHead: (html) => {
        // Title contains IS215 and course name
        expect(html).to.match(
          /<title>[^<]*IS215[^<]*Digital Business - Technologies and Transformation[^<]*<\/title>/i,
        );
        // Description contains review figures (9 reviews, 4.11/5)
        const descMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(descMatch).to.not.be.null;
        const desc = descMatch[1];
        expect(desc).to.include("9 reviews");
        expect(desc).to.include("Digital Business - Technologies and Transformation");
        expect(desc).to.include("4.11/5");
        // Canonical link points to /course/IS215
        const canonicalMatch = html.match(
          /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
        );
        expect(canonicalMatch).to.not.be.null;
        expect(canonicalMatch[1]).to.match(/\/course\/IS215$/);

        // Open Graph tags
        const ogTitleMatch = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(ogTitleMatch).to.not.be.null;
        expect(ogTitleMatch[1]).to.include("IS215");
        expect(ogTitleMatch[1]).to.include("Digital Business - Technologies and Transformation");

        const ogDescMatch = html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(ogDescMatch).to.not.be.null;
        expect(ogDescMatch[1]).to.include("9 reviews");
        expect(ogDescMatch[1]).to.include("Digital Business - Technologies and Transformation");
        expect(ogDescMatch[1]).to.include("4.11/5");

        // Twitter tags
        expect(html).to.match(
          /<meta[^>]*name=["']twitter:card["'][^>]*content=["']summary_large_image["']/i,
        );
        const twitterTitleMatch = html.match(
          /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(twitterTitleMatch).to.not.be.null;
        expect(twitterTitleMatch[1]).to.include("IS215");
        expect(twitterTitleMatch[1]).to.include("Digital Business - Technologies and Transformation");
      },
    },
    {
      name: "Course /course/IS215 with query parameters",
      url: "/course/IS215?professor=ouh-eng-lieh&sort=recent",
      assertHead: (html) => {
        // Canonical link drops query parameters
        const canonicalMatch = html.match(
          /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
        );
        expect(canonicalMatch).to.not.be.null;
        const canonicalHref = canonicalMatch[1];
        expect(canonicalHref).to.match(/\/course\/IS215$/);
        expect(canonicalHref).to.not.include("professor");
        expect(canonicalHref).to.not.include("sort");
      },
    },
    {
      name: "Professor /professor/ouh-eng-lieh",
      url: "/professor/ouh-eng-lieh",
      assertHead: (html) => {
        // Title contains Ouh Eng Lieh
        expect(html).to.match(/<title>[^<]*Ouh Eng Lieh[^<]*<\/title>/i);
        // Description contains review figures (20 reviews, 4.25/5)
        const descMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(descMatch).to.not.be.null;
        const desc = descMatch[1];
        expect(desc).to.include("20 reviews");
        expect(desc).to.match(/Ouh Eng Lieh/i);
        expect(desc).to.include("4.25/5");
        // Canonical link points to /professor/ouh-eng-lieh
        const canonicalMatch = html.match(
          /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
        );
        expect(canonicalMatch).to.not.be.null;
        expect(canonicalMatch[1]).to.match(/\/professor\/ouh-eng-lieh$/);

        // Open Graph tags
        const ogTitleMatch = html.match(
          /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(ogTitleMatch).to.not.be.null;
        expect(ogTitleMatch[1]).to.match(/Ouh Eng Lieh/i);

        const ogDescMatch = html.match(
          /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(ogDescMatch).to.not.be.null;
        expect(ogDescMatch[1]).to.include("20 reviews");
        expect(ogDescMatch[1]).to.match(/Ouh Eng Lieh/i);
        expect(ogDescMatch[1]).to.include("4.25/5");

        // Twitter tags
        expect(html).to.match(
          /<meta[^>]*name=["']twitter:card["'][^>]*content=["']summary_large_image["']/i,
        );
        const twitterTitleMatch = html.match(
          /<meta[^>]*name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(twitterTitleMatch).to.not.be.null;
        expect(twitterTitleMatch[1]).to.match(/Ouh Eng Lieh/i);
      },
    },
    {
      name: "Professor /professor/ouh-eng-lieh with query parameters",
      url: "/professor/ouh-eng-lieh?sort=recent",
      assertHead: (html) => {
        // Canonical link drops query parameters
        const canonicalMatch = html.match(
          /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
        );
        expect(canonicalMatch).to.not.be.null;
        const canonicalHref = canonicalMatch[1];
        expect(canonicalHref).to.match(/\/professor\/ouh-eng-lieh$/);
        expect(canonicalHref).to.not.include("sort");
      },
    },
    {
      name: "Non-existent course /course/DOESNOTEXIST",
      url: "/course/DOESNOTEXIST",
      failOnStatusCode: false,
      assertHead: (html) => {
        expect(html).to.match(/<title>[^<]*Course Not Found[^<]*<\/title>/i);
      },
    },
    {
      name: "Non-existent professor /professor/does-not-exist",
      url: "/professor/does-not-exist",
      failOnStatusCode: false,
      assertHead: (html) => {
        expect(html).to.match(/<title>[^<]*Professor Not Found[^<]*<\/title>/i);
      },
    },
    {
      name: "Course with 0 reviews /course/MGMT214",
      url: "/course/MGMT214",
      assertHead: (html) => {
        expect(html).to.match(
          /<title>[^<]*MGMT214[^<]*Management and Leadership: A Seminar with CEOs[^<]*<\/title>/i,
        );
        const descMatch = html.match(
          /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i,
        );
        expect(descMatch).to.not.be.null;
        const desc = descMatch[1];
        expect(desc).to.include(
          "Read reviews and ratings for Management and Leadership: A Seminar with CEOs at AfterClass.",
        );
      },
    },
  ];

  TEST_CASES.forEach(({ name, url, failOnStatusCode = true, assertHead }) => {
    it(`should serve correct head tags for ${name}`, () => {
      cy.request({
        url,
        failOnStatusCode,
      }).then((response) => {
        assertHead(response.body);
      });
    });
  });
});

describe("SEO: Structured Data (JSON-LD)", () => {
  function extractJsonLd(html) {
    const regex =
      /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
    const items = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        items.push(...parsed);
      } else {
        items.push(parsed);
      }
    }
    return items;
  }

  it("serves valid Course JSON-LD with aggregateRating and BreadcrumbList for /course/IS215", () => {
    cy.request("/course/IS215").then((response) => {
      const jsonLd = extractJsonLd(response.body);
      const course = jsonLd.find((item) => item["@type"] === "Course");
      expect(course, "Course JSON-LD exists").to.not.be.undefined;
      expect(course.name).to.include(
        "Digital Business - Technologies and Transformation",
      );
      expect(course.courseCode).to.eq("IS215");
      expect(course.provider).to.not.be.undefined;
      expect(course.provider["@type"]).to.eq("Organization");
      expect(course.provider.name).to.include(
        "Singapore Management University",
      );

      expect(course.aggregateRating, "aggregateRating exists").to.not.be
        .undefined;
      expect(course.aggregateRating["@type"]).to.eq("AggregateRating");
      expect(Number(course.aggregateRating.ratingValue)).to.eq(4.11);
      expect(String(course.aggregateRating.bestRating)).to.eq("5");
      expect(String(course.aggregateRating.worstRating)).to.eq("1");
      expect(course.aggregateRating.ratingCount).to.eq(9);

      const breadcrumbs = jsonLd.find(
        (item) => item["@type"] === "BreadcrumbList",
      );
      expect(breadcrumbs, "BreadcrumbList exists").to.not.be.undefined;
      expect(breadcrumbs.itemListElement).to.have.length(2);
      expect(breadcrumbs.itemListElement[0].name).to.eq("Home");
      expect(breadcrumbs.itemListElement[1].name).to.include(
        "Digital Business - Technologies and Transformation",
      );
      expect(breadcrumbs.itemListElement[1].item).to.include("/course/IS215");
    });
  });

  it("serves Course JSON-LD WITHOUT aggregateRating for /course/MGMT214 (0 reviews)", () => {
    cy.request("/course/MGMT214").then((response) => {
      const jsonLd = extractJsonLd(response.body);
      const course = jsonLd.find((item) => item["@type"] === "Course");
      // Tautological Test Prevention: Assert the entity exists and the field is undefined unconditionally
      expect(course, "Course JSON-LD exists").to.not.be.undefined;
      expect(course.name).to.include(
        "Management and Leadership: A Seminar with CEOs",
      );
      expect(course.courseCode).to.eq("MGMT214");
      expect(course.provider).to.not.be.undefined;
      expect(
        course.aggregateRating,
        "aggregateRating must be omitted unconditionally when review count is 0",
      ).to.be.undefined;

      const breadcrumbs = jsonLd.find(
        (item) => item["@type"] === "BreadcrumbList",
      );
      expect(breadcrumbs, "BreadcrumbList exists").to.not.be.undefined;
      expect(breadcrumbs.itemListElement).to.have.length(2);
      expect(breadcrumbs.itemListElement[0].name).to.eq("Home");
      expect(breadcrumbs.itemListElement[1].name).to.include(
        "Management and Leadership: A Seminar with CEOs",
      );
    });
  });

  it("serves Person JSON-LD with aggregateRating and BreadcrumbList for /professor/ouh-eng-lieh", () => {
    cy.request("/professor/ouh-eng-lieh").then((response) => {
      const jsonLd = extractJsonLd(response.body);
      const person = jsonLd.find((item) => item["@type"] === "Person");
      expect(person, "Person JSON-LD exists").to.not.be.undefined;
      expect(person.name).to.match(/Ouh Eng Lieh/i);
      expect(person.jobTitle).to.eq("Professor");

      expect(person.aggregateRating, "aggregateRating exists").to.not.be
        .undefined;
      expect(person.aggregateRating["@type"]).to.eq("AggregateRating");
      expect(Number(person.aggregateRating.ratingValue)).to.eq(4.25);
      expect(String(person.aggregateRating.bestRating)).to.eq("5");
      expect(String(person.aggregateRating.worstRating)).to.eq("1");
      expect(person.aggregateRating.ratingCount).to.eq(20);

      const breadcrumbs = jsonLd.find(
        (item) => item["@type"] === "BreadcrumbList",
      );
      expect(breadcrumbs, "BreadcrumbList exists").to.not.be.undefined;
      expect(breadcrumbs.itemListElement).to.have.length(2);
      expect(breadcrumbs.itemListElement[0].name).to.eq("Home");
      expect(breadcrumbs.itemListElement[1].name).to.match(/Ouh Eng Lieh/i);
      expect(breadcrumbs.itemListElement[1].item).to.include(
        "/professor/ouh-eng-lieh",
      );
    });
  });

  it("serves WebSite JSON-LD with SearchAction for /", () => {
    cy.request("/").then((response) => {
      const jsonLd = extractJsonLd(response.body);
      const website = jsonLd.find((item) => item["@type"] === "WebSite");
      expect(website, "WebSite JSON-LD exists").to.not.be.undefined;
      expect(website.potentialAction, "SearchAction exists").to.not.be.undefined;
      expect(website.potentialAction["@type"]).to.eq("SearchAction");
      expect(website.potentialAction.target).to.include(
        "/search?q={search_term_string}",
      );
      expect(website.potentialAction["query-input"]).to.eq(
        "required name=search_term_string",
      );
    });
  });
});

