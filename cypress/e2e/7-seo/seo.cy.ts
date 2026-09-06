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
  });
});
