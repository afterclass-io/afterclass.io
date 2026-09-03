/// <reference types="cypress" />

context("Reviews: SEO Discovery", function () {
  it("should serve robots.txt with disallow directives and sitemap reference", function () {
    cy.request("/robots.txt").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("text/plain");
      expect(response.body).to.include("Disallow:");
      expect(response.body).to.include("Sitemap:");
    });
  });

  it("should serve sitemap.xml containing courses, professors, and static routes", function () {
    cy.request("/sitemap.xml").then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers["content-type"]).to.include("xml");
      expect(response.body).to.include("/course/IS215");
      expect(response.body).to.include("/professor/yixin-cao");
    });
  });
});
