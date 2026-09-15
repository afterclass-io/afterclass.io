/// <reference types="cypress" />

// Route metadata is asserted against the raw response body, never `cy.visit()`.
// Metadata is streamed after the initial empty <head>, so each pattern is run
// against the whole body rather than a slice up to </head>. Covering a new
// route is a row in this table.
const PAGES = [
  {
    url: "/",
    name: "Home",
    title: /<title>AfterClass<\/title>/,
    description:
      /<meta name="description" content="[^"]*Read 12,000\+ reviews[^"]*"\/>/,
  },
  {
    url: "/course/IS215",
    name: "Course",
    title:
      /<title>Digital Business - Technologies and Transformation \(IS215\) \| AfterClass<\/title>/,
    description:
      /<meta name="description" content="[^"]*9 student reviews with a 4\.11\/5 average rating across 6 professors[^"]*"\/>/,
  },
  {
    url: "/professor/ouh-eng-lieh",
    name: "Professor",
    title: /<title>OUH Eng Lieh \| AfterClass<\/title>/,
    description:
      /<meta name="description" content="[^"]*20 student reviews with a 4\.25\/5 average rating across 2 courses\. Most-cited label: Engaging\.[^"]*"\/>/,
  },
  {
    url: "/course/MGMT214",
    name: "Course with no reviews",
    title:
      /<title>Management and Leadership: A Seminar with CEOs \(MGMT214\) \| AfterClass<\/title>/,
    // A course with zero reviews must not be described with a fabricated rating.
    description:
      /<meta name="description" content="[^"]*no student reviews yet; taught by 5 professors[^"]*"\/>/,
  },
  {
    url: "/course/ZZZ999",
    name: "Missing course",
    title: /<title>Course not found \| AfterClass<\/title>/,
    description:
      /<meta name="description" content="[^"]*Read 12,000\+ reviews[^"]*"\/>/,
  },
];

context("Reviews: Route metadata", function () {
  PAGES.forEach(({ url, name, title, description }) => {
    it(`${name} (${url}) serves its own title and description`, function () {
      cy.request({
        url: `${Cypress.config("baseUrl")}${url}`,
        failOnStatusCode: false,
      }).then((response) => {
        const body = response.body;
        expect(body, "raw response body").to.match(title);
        expect(body, "raw response body").to.match(description);
      });
    });
  });
});

// Emitted formats observed live: `content="noindex, nofollow"` on most routes,
// bare `content="noindex"` on the not-found / NextAuth-signin shells. Match the
// directive itself, not the exact suffix.
const NOINDEX = /<meta[^>]*name="robots"[^>]*content="noindex/;

// #527 — crawl discovery files.
context("Reviews: Discovery files", function () {
  it("/robots.txt disallows private surfaces and points at the sitemap", function () {
    cy.request(`${Cypress.config("baseUrl")}/robots.txt`).then((response) => {
      expect(response.status, "status").to.eq(200);
      expect(response.headers["content-type"], "content-type").to.include(
        "text/plain",
      );

      const body = response.body;
      [
        "/api/",
        "/.well-known/",
        "/account/auth/",
        "/submit",
        "/search",
      ].forEach((rule) => {
        expect(body, `Disallow: ${rule}`).to.contain(`Disallow: ${rule}`);
      });
      expect(body, "sitemap directive").to.match(/^Sitemap: /m);

      // Local (VERCEL_ENV unset) must stay crawlable, never the blanket rule.
      expect(body, "blanket Disallow: /").to.not.match(/^Disallow: \/$/m);
    });
  });

  it("/sitemap.xml lists the canonical public routes", function () {
    cy.request(`${Cypress.config("baseUrl")}/sitemap.xml`).then((response) => {
      expect(response.status, "status").to.eq(200);
      expect(response.headers["content-type"], "content-type").to.include(
        "application/xml",
      );

      [
        "/course/IS215",
        "/professor/ouh-eng-lieh",
        "/privacy",
        "/terms",
      ].forEach((path) => {
        expect(response.body, path).to.contain(path);
      });
    });
  });
});

// #530 — routes that must never be indexed. Anonymous-only routes redirect
// first (`/assistant` -> login, `/submit` -> NextAuth signin, `/account/auth/
// verify` -> /not-found); following the redirect and asserting the terminal
// page is noindexed covers both the 200 and the 3xx cases.
const NON_INDEXABLE = [
  "/timetable",
  "/search",
  "/submit",
  "/account/auth/login",
  "/account/auth/signup",
  "/account/auth/verify",
  "/account/auth/forgot",
  "/account/auth/reset-password",
  "/account/auth/confirm-account",
  "/assistant",
  "/mcp",
  "/settings/agents",
  "/oauth/consent",
];

const INDEXABLE = [
  "/",
  "/course/IS215",
  "/professor/ouh-eng-lieh",
  "/privacy",
  "/terms",
];

context("Reviews: Crawl directives", function () {
  describe("Non-indexable routes carry noindex", function () {
    NON_INDEXABLE.forEach((url) => {
      it(`${url} resolves to a noindexed page`, function () {
        cy.request({
          url: `${Cypress.config("baseUrl")}${url}`,
          followRedirects: true,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body, `raw response body for ${url}`).to.match(
            NOINDEX,
          );
        });
      });
    });
  });

  describe("Content routes remain indexable", function () {
    INDEXABLE.forEach((url) => {
      it(`${url} does not carry the noindex directive`, function () {
        cy.request({
          url: `${Cypress.config("baseUrl")}${url}`,
          failOnStatusCode: false,
        }).then((response) => {
          expect(response.body, `raw response body for ${url}`).to.not.match(
            NOINDEX,
          );
        });
      });
    });
  });

  it("/roadmaps?view=mine sends an anonymous crawler to the login screen", function () {
    cy.request({
      url: `${Cypress.config("baseUrl")}/roadmaps?view=mine`,
      followRedirects: false,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, "status").to.eq(307);
      expect(response.headers.location, "location").to.eq(
        "/account/auth/login?callbackUrl=%2Froadmaps%3Fview%3Dmine",
      );
    });
  });
});

// #534 — redirect permanence and the 404 shell.
context("Reviews: Redirect permanence and 404", function () {
  it("/reviews permanently (308) redirects to /", function () {
    cy.request({
      url: `${Cypress.config("baseUrl")}/reviews`,
      followRedirects: false,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, "status").to.eq(308);
      expect(response.headers.location, "location").to.eq("/");
    });
  });

  it("/account/auth/verify without email stays temporary (307) and redirects to /not-found", function () {
    cy.request({
      url: `${Cypress.config("baseUrl")}/account/auth/verify`,
      followRedirects: false,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, "status").to.eq(307);
      expect(response.status, "status is not permanent").to.not.eq(308);
      expect(response.headers.location, "location").to.eq("/not-found");
    });
  });

  it("missing URLs respond 404 with the Page not found title", function () {
    cy.request({
      url: `${Cypress.config("baseUrl")}/definitely-missing-seo-xyz`,
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status, "status").to.eq(404);
      expect(response.body, "raw response body").to.contain(
        "<title>Page not found | AfterClass</title>",
      );
    });
  });
});

// #529 — structured data in the raw HTML a crawler receives. Each block is
// parsed out and asserted by @type. The table names the types a route must
// carry and the rating its entity must declare; a zero-review course asserts
// the key is absent, the branch a type-check cannot catch.
const JSON_LD =
  /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;

function jsonLdBlocks(body) {
  return [...body.matchAll(JSON_LD)].map((match) => JSON.parse(match[1]));
}

const STRUCTURED_DATA = [
  {
    url: "/course/IS215",
    name: "Course",
    entity: "Course",
    types: ["Course", "BreadcrumbList"],
    aggregate: { bestRating: 5, worstRating: 1, reviewCount: 9 },
  },
  {
    url: "/professor/ouh-eng-lieh",
    name: "Professor",
    entity: "Person",
    types: ["Person", "BreadcrumbList"],
    aggregate: { bestRating: 5, worstRating: 1, reviewCount: 20 },
  },
  {
    url: "/course/MGMT214",
    name: "Course with no reviews",
    entity: "Course",
    types: ["Course", "BreadcrumbList"],
    aggregate: null,
  },
];

context("Reviews: Structured data", function () {
  STRUCTURED_DATA.forEach(({ url, name, entity, types, aggregate }) => {
    it(`${name} (${url}) serves JSON-LD of the expected types`, function () {
      cy.request({
        url: `${Cypress.config("baseUrl")}${url}`,
        failOnStatusCode: false,
      }).then((response) => {
        const byType = new Map(
          jsonLdBlocks(response.body).map((block) => [block["@type"], block]),
        );

        types.forEach((type) => {
          expect(byType.get(type), `${type} block on ${url}`).to.exist;
        });

        const record = byType.get(entity);
        if (aggregate) {
          expect(record.aggregateRating.bestRating, "bestRating").to.eq(
            aggregate.bestRating,
          );
          expect(record.aggregateRating.worstRating, "worstRating").to.eq(
            aggregate.worstRating,
          );
          expect(record.aggregateRating.reviewCount, "reviewCount").to.eq(
            aggregate.reviewCount,
          );
        } else {
          expect(
            record,
            "unrated course omits aggregateRating",
          ).to.not.have.property("aggregateRating");
        }
      });
    });
  });

  it("Home (/) serves WebSite with a required SearchAction", function () {
    cy.request({
      url: `${Cypress.config("baseUrl")}/`,
      failOnStatusCode: false,
    }).then((response) => {
      const website = jsonLdBlocks(response.body).find(
        (block) => block["@type"] === "WebSite",
      );

      expect(website, "WebSite block").to.exist;
      expect(website.potentialAction["@type"], "SearchAction").to.eq(
        "SearchAction",
      );
      expect(website.potentialAction.target, "search target").to.contain(
        "/search?q={search_term_string}",
      );
      expect(website.potentialAction["query-input"], "query-input").to.contain(
        "required",
      );
    });
  });
});

// #528 — one canonical per route, junk query parameters stripped. The href is
// absolute, so build it from the baseUrl. `/roadmaps?view=mine` is deliberately
// absent: it 307s anonymous crawlers to the login screen, whose terminal page
// carries /account/auth/login instead; the query-stripping rule is pinned on
// /roadmaps?sort=rating, which resolves 200.
const CANONICALS = [
  { url: "/course/IS215?professor=x&sort=rating", path: "/course/IS215" },
  { url: "/course/is215?sort=rating", path: "/course/IS215" },
  {
    url: "/professor/ouh-eng-lieh?course=IS215&sort=rating",
    path: "/professor/ouh-eng-lieh",
  },
  { url: "/bidding?course=IS215&prof=x", path: "/bidding" },
  {
    url: "/bidding/analytics?classId=1&course=IS215&section=G1&rounds=1&windows=1&prof=x",
    path: "/bidding/analytics",
  },
  { url: "/roadmaps?sort=rating", path: "/roadmaps" },
  { url: "/search?q=IS215", path: "/search" },
  { url: "/timetable?acadTermId=1", path: "/timetable" },
  { url: "/oauth/consent?authorization_id=abc", path: "/oauth/consent" },
  {
    url: "/account/auth/login?callbackUrl=%2F&email=a@b.c",
    path: "/account/auth/login",
  },
];

context("Reviews: Canonicals and Open Graph", function () {
  describe("Canonical links strip junk query parameters", function () {
    CANONICALS.forEach(({ url, path }) => {
      it(`${url} declares ${path}`, function () {
        cy.request({
          url: `${Cypress.config("baseUrl")}${url}`,
          failOnStatusCode: false,
        }).then((response) => {
          const expected = `<link rel="canonical" href="${Cypress.config(
            "baseUrl",
          )}${path}"/>`;
          expect(response.body, `raw response body for ${url}`).to.contain(
            expected,
          );
        });
      });
    });
  });

  // #531 — social unfurl tags. og:* use `property`, twitter:* use `name`; the
  // helper tolerates either so the table stays declarative.
  function metaContent(body, key) {
    const match = body.match(
      new RegExp(`<meta[^>]*(?:property|name)="${key}"[^>]*content="([^"]*)"`),
    );
    return match && match[1];
  }

  const OPEN_GRAPH = [
    {
      url: "/course/IS215",
      name: "Course",
      titleIncludes:
        "Digital Business - Technologies and Transformation (IS215)",
      descriptionIncludes: ["/5", "student reviews"],
      ogPath: "/course/IS215",
      image: true,
    },
    {
      url: "/professor/ouh-eng-lieh",
      name: "Professor",
      titleIncludes: "OUH Eng Lieh",
      descriptionIncludes: ["/5", "student reviews"],
      ogPath: "/professor/ouh-eng-lieh",
      image: true,
    },
    {
      url: "/",
      name: "Home",
      titleIncludes: null,
      descriptionIncludes: [],
      ogPath: "",
      image: false,
    },
  ];

  describe("Open Graph and Twitter cards", function () {
    OPEN_GRAPH.forEach(
      ({ url, name, titleIncludes, descriptionIncludes, ogPath, image }) => {
        it(`${name} (${url}) serves complete social unfurl tags`, function () {
          cy.request({
            url: `${Cypress.config("baseUrl")}${url}`,
            failOnStatusCode: false,
          }).then((response) => {
            const body = response.body;

            expect(metaContent(body, "og:url"), `og:url for ${url}`).to.eq(
              `${Cypress.config("baseUrl")}${ogPath}`,
            );
            expect(
              metaContent(body, "og:site_name"),
              `og:site_name for ${url}`,
            ).to.eq("AfterClass");
            expect(
              metaContent(body, "og:locale"),
              `og:locale for ${url}`,
            ).to.eq("en_GB");
            expect(metaContent(body, "og:type"), `og:type for ${url}`).to.eq(
              "website",
            );
            expect(
              metaContent(body, "twitter:card"),
              `twitter:card for ${url}`,
            ).to.eq("summary_large_image");

            if (titleIncludes) {
              expect(
                metaContent(body, "og:title"),
                `og:title for ${url}`,
              ).to.contain(titleIncludes);
              expect(
                metaContent(body, "twitter:title"),
                `twitter:title for ${url}`,
              ).to.contain(titleIncludes);
            }

            descriptionIncludes.forEach((needle) => {
              expect(
                metaContent(body, "og:description"),
                `og:description for ${url} contains ${needle}`,
              ).to.contain(needle);
            });

            if (image) {
              const ogImage = metaContent(body, "og:image");
              expect(ogImage, `og:image for ${url}`).to.exist;
              expect(ogImage, `og:image for ${url} is absolute`).to.contain(
                Cypress.config("baseUrl"),
              );
            }
          });
        });
      },
    );
  });
});
