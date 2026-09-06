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
