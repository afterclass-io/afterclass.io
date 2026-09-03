/// <reference types="cypress" />

function parseHtml(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function getHeadMetadata(html) {
  const doc = parseHtml(html);
  const title = doc.querySelector("title")?.textContent?.trim() ?? "";
  const description =
    doc
      .querySelector('meta[name="description"]')
      ?.getAttribute("content")
      ?.trim() ?? "";
  const canonical =
    doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";
  const ogTitle =
    doc.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
    "";
  const ogDescription =
    doc
      .querySelector('meta[property="og:description"]')
      ?.getAttribute("content") ?? "";
  const ogUrl =
    doc.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? "";
  const ogImage =
    doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
    "";
  const twitterCard =
    doc.querySelector('meta[name="twitter:card"]')?.getAttribute("content") ??
    "";
  const twitterTitle =
    doc.querySelector('meta[name="twitter:title"]')?.getAttribute("content") ??
    "";

  return {
    title,
    description,
    canonical,
    ogTitle,
    ogDescription,
    ogUrl,
    ogImage,
    twitterCard,
    twitterTitle,
  };
}

function getJsonLdScripts(html) {
  const doc = parseHtml(html);
  const scripts = Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  );
  const jsonObjects = [];
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script.textContent || "");
      if (Array.isArray(parsed)) {
        jsonObjects.push(...parsed);
      } else {
        jsonObjects.push(parsed);
      }
    } catch {
      // ignore invalid json
    }
  }
  return jsonObjects;
}

const HEAD_METADATA_ROUTES = [
  {
    name: "Home page",
    url: "/",
    expectedStatus: 200,
    expectedTitle: "AfterClass",
    expectedDescription: "Read 12,000+ reviews of courses and professors",
  },
  {
    name: "Course page (IS215)",
    url: "/course/IS215",
    expectedStatus: 200,
    expectedTitle:
      "IS215: Digital Business - Technologies and Transformation | AfterClass",
    expectedDescriptionPattern:
      /^IS215: Digital Business - Technologies and Transformation has \d+ reviews with an average rating of \d+\.\d+\/5 on AfterClass\.$/,
  },
  {
    name: "Professor page (yixin-cao)",
    url: "/professor/yixin-cao",
    expectedStatus: 200,
    expectedTitle: "Yixin CAO | AfterClass",
    expectedDescriptionPattern:
      /^Yixin CAO has \d+ reviews with an average rating of \d+\.\d+\/5 on AfterClass\.$/,
  },
  {
    name: "Missing course",
    url: "/course/NONEXISTENT999",
    expectedStatus: 200,
    expectedTitlePattern: /Course Not Found \| AfterClass/,
  },
  {
    name: "Missing professor",
    url: "/professor/nonexistent-prof-999",
    expectedStatus: 200,
    expectedTitlePattern: /Professor Not Found \| AfterClass/,
  },
  {
    name: "404 page",
    url: "/nonexistent-page-404",
    expectedStatus: 404,
    expectedTitlePattern: /Page Not Found \| AfterClass/,
  },
];

context("Reviews: SEO Head Metadata", function () {
  HEAD_METADATA_ROUTES.forEach(
    ({
      name,
      url,
      expectedStatus,
      expectedTitle,
      expectedTitlePattern,
      expectedDescription,
      expectedDescriptionPattern,
    }) => {
      it(`should serve correct head metadata for ${name} (${url})`, function () {
        cy.request({
          url,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.status).to.eq(expectedStatus);
          const { title, description } = getHeadMetadata(response.body);

          if (expectedTitle) {
            expect(title).to.eq(expectedTitle);
          }
          if (expectedTitlePattern) {
            expect(title).to.match(expectedTitlePattern);
          }
          if (expectedDescription) {
            expect(description).to.include(expectedDescription);
          }
          if (expectedDescriptionPattern) {
            expect(description).to.match(expectedDescriptionPattern);
          }
        });
      });
    },
  );

  describe("Canonical URLs and Query Parameters", function () {
    it("should strip query parameters from course canonical URL", function () {
      cy.request("/course/IS215?professor=some-slug&sort=recent&page=2").then(
        (response) => {
          const { canonical } = getHeadMetadata(response.body);
          expect(canonical).to.include("/course/IS215");
          expect(canonical).not.to.include("professor=");
          expect(canonical).not.to.include("sort=");
        },
      );
    });

    it("should strip query parameters from professor canonical URL", function () {
      cy.request("/professor/yixin-cao?course=IS215&filter=something").then(
        (response) => {
          const { canonical } = getHeadMetadata(response.body);
          expect(canonical).to.include("/professor/yixin-cao");
          expect(canonical).not.to.include("course=");
          expect(canonical).not.to.include("filter=");
        },
      );
    });

    it("should serve canonical URL on home page", function () {
      cy.request("/").then((response) => {
        const { canonical } = getHeadMetadata(response.body);
        expect(canonical).to.include("http://localhost:3000");
      });
    });

    it("should strip query parameters from roadmaps canonical URL", function () {
      cy.request("/roadmaps?filter=term&sort=popular").then((response) => {
        const { canonical } = getHeadMetadata(response.body);
        expect(canonical).to.include("/roadmaps");
        expect(canonical).not.to.include("filter=");
        expect(canonical).not.to.include("sort=");
      });
    });
  });

  describe("Open Graph and Twitter Cards", function () {
    it("should serve Open Graph and Twitter tags on course page", function () {
      cy.request("/course/IS215").then((response) => {
        const meta = getHeadMetadata(response.body);
        expect(meta.ogTitle).to.include("IS215");
        expect(meta.ogDescription).to.include("reviews");
        expect(meta.twitterCard).to.eq("summary_large_image");
        expect(meta.twitterTitle).to.include("IS215");
      });
    });

    it("should serve Open Graph and Twitter tags on professor page", function () {
      cy.request("/professor/yixin-cao").then((response) => {
        const meta = getHeadMetadata(response.body);
        expect(meta.ogTitle).to.include("Yixin CAO");
        expect(meta.ogDescription).to.include("reviews");
        expect(meta.twitterCard).to.eq("summary_large_image");
        expect(meta.twitterTitle).to.include("Yixin CAO");
      });
    });

    it("should serve root Open Graph and Twitter card on home page", function () {
      cy.request("/").then((response) => {
        const meta = getHeadMetadata(response.body);
        expect(meta.ogTitle).to.eq("AfterClass");
        expect(meta.twitterCard).to.eq("summary_large_image");
      });
    });
  });

  describe("Structured Data (JSON-LD)", function () {
    it("should serve valid Course JSON-LD and breadcrumbs on course page", function () {
      cy.request("/course/IS215").then((response) => {
        const jsonLd = getJsonLdScripts(response.body);
        const course = jsonLd.find((item) => item["@type"] === "Course");
        const breadcrumbs = jsonLd.find(
          (item) => item["@type"] === "BreadcrumbList",
        );

        expect(course).to.exist;
        expect(course.name).to.include("IS215");
        expect(course.provider).to.exist;

        if (course.aggregateRating) {
          expect(Number(course.aggregateRating.bestRating)).to.eq(5);
          expect(Number(course.aggregateRating.worstRating)).to.eq(1);
          expect(Number(course.aggregateRating.ratingValue)).to.be.at.least(1);
        }

        expect(breadcrumbs).to.exist;
        expect(breadcrumbs.itemListElement).to.be.an("array");
        expect(breadcrumbs.itemListElement[0].name).to.eq("Home");
      });
    });

    it("should omit AggregateRating on zero-review course", function () {
      // MGMT214 has 0 reviews in seed database
      cy.request("/course/MGMT214").then((response) => {
        expect(response.status).to.eq(200);
        const jsonLd = getJsonLdScripts(response.body);
        const course = jsonLd.find((item) => item["@type"] === "Course");
        expect(course).to.exist;
        expect(course.aggregateRating).to.be.undefined;
      });
    });

    it("should serve valid Person JSON-LD and breadcrumbs on professor page", function () {
      cy.request("/professor/yixin-cao").then((response) => {
        const jsonLd = getJsonLdScripts(response.body);
        const person = jsonLd.find((item) => item["@type"] === "Person");
        const breadcrumbs = jsonLd.find(
          (item) => item["@type"] === "BreadcrumbList",
        );

        expect(person).to.exist;
        expect(person.name).to.eq("Yixin CAO");
        expect(person.jobTitle).to.eq("Professor");

        if (person.aggregateRating) {
          expect(Number(person.aggregateRating.bestRating)).to.eq(5);
          expect(Number(person.aggregateRating.worstRating)).to.eq(1);
        }

        expect(breadcrumbs).to.exist;
        expect(breadcrumbs.itemListElement).to.be.an("array");
      });
    });

    it("should serve WebSite JSON-LD with SearchAction on home page", function () {
      cy.request("/").then((response) => {
        const jsonLd = getJsonLdScripts(response.body);
        const website = jsonLd.find((item) => item["@type"] === "WebSite");

        expect(website).to.exist;
        expect(website.name).to.eq("AfterClass");
        expect(website.potentialAction).to.exist;
        expect(website.potentialAction["@type"]).to.eq("SearchAction");
      });
    });
  });

  describe("Private Routes and Robots Directives", function () {
    const PRIVATE_ROUTES = [
      "/account/auth/login",
      "/account/auth/signup",
      "/timetable",
      "/submit",
      "/search",
      "/roadmaps/mine",
    ];

    PRIVATE_ROUTES.forEach((route) => {
      it(`should mark ${route} with noindex, nofollow`, function () {
        cy.request({ url: route, failOnStatusCode: false }).then((response) => {
          const doc = parseHtml(response.body);
          const robotsMeta = doc
            .querySelector('meta[name="robots"]')
            ?.getAttribute("content");
          expect(robotsMeta).to.include("noindex");
          expect(robotsMeta).to.include("nofollow");
        });
      });
    });
  });

  describe("Viewport and Zoom Scaling (WCAG 1.4.4)", function () {
    it("should not restrict viewport zoom scaling with maximum-scale", function () {
      cy.request("/").then((response) => {
        const doc = parseHtml(response.body);
        const viewport =
          doc.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
          "";
        expect(viewport).not.to.include("maximum-scale");
        expect(viewport).not.to.include("user-scalable=no");
      });
    });
  });

  describe("Redirects Permanence", function () {
    it("should redirect /reviews permanently with 308 to /", function () {
      cy.request({
        url: "/reviews",
        followRedirect: false,
      }).then((response) => {
        expect(response.status).to.eq(308);
        expect(response.headers.location).to.eq("/");
      });
    });
  });

  describe("Icons and Web Manifest", function () {
    it("should link to manifest and icons in the head", function () {
      cy.request("/").then((response) => {
        const doc = parseHtml(response.body);
        const manifestLink = doc.querySelector('link[rel="manifest"]');
        expect(manifestLink).to.not.be.null;

        const iconLink = doc.querySelector('link[rel="icon"]');
        expect(iconLink).to.not.be.null;

        const appleIconLink = doc.querySelector('link[rel="apple-touch-icon"]');
        expect(appleIconLink).to.not.be.null;
      });
    });

    it("should serve a valid web manifest", function () {
      cy.request("/manifest.webmanifest").then((response) => {
        expect(response.status).to.eq(200);
        const manifest =
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body;
        expect(manifest.name).to.eq("AfterClass");
        expect(manifest.short_name).to.eq("AfterClass");
        expect(manifest.start_url).to.eq("/");
        expect(manifest.display).to.eq("standalone");
        expect(manifest.background_color).to.eq("#131316");
        expect(manifest.theme_color).to.eq("#131316");
        expect(manifest.icons).to.be.an("array").and.not.be.empty;
      });
    });

    it("should serve the favicon under 10 KB", function () {
      cy.request("/favicon.ico").then((response) => {
        expect(response.status).to.eq(200);
        const size = response.headers["content-length"]
          ? Number(response.headers["content-length"])
          : response.body.length;
        expect(size).to.be.lessThan(10240);
      });
    });
  });
});
