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
