/// <reference types="cypress" />

context("SEO: Discovery & Metadata", function () {
  describe("Discovery files", function () {
    it("should respond to /robots.txt with appropriate crawl rules and sitemap pointer", function () {
      cy.request("/robots.txt").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.include("text/plain");

        // Verify User-Agent rule
        expect(response.body).to.match(/User-Agent:\s*\*/i);
        // Non-production environment gate disallows all crawling
        expect(response.body).to.match(/Disallow:\s*\//);
        // Declares the sitemap location
        expect(response.body).to.match(/Sitemap:\s*https?:\/\/.*\/sitemap\.xml/);
      });
    });

    it("should respond to /sitemap.xml and include static routes, courses, professors, and public roadmaps", function () {
      cy.request("/sitemap.xml").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.match(/xml/);

        const body = response.body as string;
        expect(body).to.include("<urlset");

        // Static public routes
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/<\/loc>/);
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/roadmaps<\/loc>/);
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/bidding<\/loc>/);

        // Course route (known seeded course: IS215)
        expect(body).to.include("/course/");
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/course\/IS215<\/loc>/);

        // Professor route (known seeded professor: yixin-cao)
        expect(body).to.include("/professor/");
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/professor\/yixin-cao<\/loc>/);

        // Public roadmap route (known seeded public roadmap: roadmap-002-user-a)
        expect(body).to.include("/roadmaps/");
        expect(body).to.match(/<loc>https?:\/\/[^<]+\/roadmaps\/roadmap-002-user-a<\/loc>/);
      });
    });

    it("should respond to /manifest.webmanifest with valid manifest JSON and expected fields", function () {
      cy.request("/manifest.webmanifest").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.match(/manifest\+json|json/);

        const manifest = (
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body
        ) as {
          name?: string;
          short_name?: string;
          start_url?: string;
          display?: string;
          background_color?: string;
          theme_color?: string;
          icons?: Array<{ src: string; sizes?: string; type?: string }>;
        };

        expect(manifest.name).to.eq("AfterClass");
        expect(manifest.short_name).to.eq("AfterClass");
        expect(manifest.start_url).to.eq("/");
        expect(manifest.display).to.eq("standalone");
        expect(manifest.background_color).to.eq("#F1F1F3");
        expect(manifest.theme_color).to.eq("#F1F1F3");
        expect(Array.isArray(manifest.icons)).to.eq(true);
        expect(manifest.icons?.length).to.be.greaterThan(0);
      });
    });

    it("should serve /icon and /apple-icon with image/png content type and status 200", function () {
      cy.request("/icon").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.include("image/png");
      });

      cy.request("/apple-icon").then((response) => {
        expect(response.status).to.eq(200);
        expect(response.headers["content-type"]).to.include("image/png");
      });
    });

    it("should serve all icons declared in the manifest with status 200", function () {
      cy.request("/manifest.webmanifest").then((response) => {
        const manifest = (
          typeof response.body === "string"
            ? JSON.parse(response.body)
            : response.body
        ) as {
          icons?: Array<{ src: string; sizes?: string; type?: string }>;
        };

        expect(Array.isArray(manifest.icons)).to.eq(true);
        expect(manifest.icons?.length).to.be.greaterThan(0);

        manifest.icons?.forEach((icon) => {
          cy.request(icon.src).then((iconResponse) => {
            expect(iconResponse.status).to.eq(200);
            if (icon.type) {
              if (icon.type === "image/x-icon") {
                expect(iconResponse.headers["content-type"]).to.match(
                  /image\/(x-icon|vnd\.microsoft\.icon)/,
                );
              } else {
                expect(iconResponse.headers["content-type"]).to.include(
                  icon.type,
                );
              }
            }
          });
        });
      });
    });
  });
});
