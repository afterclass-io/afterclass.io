/// <reference types="cypress" />

const PAGES_TO_TEST = [
  { url: "/", name: "Home", searchForCourse: "CS301", searchForProf: "vivien" },
  {
    url: "/search?q=IS215",
    name: "Search",
    searchForCourse: "CS301",
    searchForProf: "vivien",
  },
  {
    url: "/course/IS215",
    name: "Course",
    searchForCourse: "CS301",
    searchForProf: "vivien",
  },
  {
    url: "/professor/ouh-eng-lieh",
    name: "Professor",
    searchForCourse: "CS301",
    searchForProf: "vivien",
  },
];

context("Reviews: Search", function () {
  PAGES_TO_TEST.forEach(({ url, name, searchForCourse, searchForProf }) => {
    describe(`Search Functionality on ${name} Page`, function () {
      beforeEach(function () {
        cy.visit(url);
        cy.wait(1000);
      });

      it("should bring up searchbar when shortcut or search input is clicked", function () {
        cy.get("[data-test=search-cmdk-trigger]").should("be.visible").click();
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type("{esc}");

        cy.get("body").type("/", { release: false });
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type("{esc}");
      });

      it("should be able to search for a course", function () {
        cy.get("[data-test=search-cmdk-trigger]").should("be.visible").click();
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type(searchForCourse);

        cy.get("[data-test=search-cmdk-submit]").click();

        cy.url().should(
          "eq",
          `${Cypress.config("baseUrl")}/search?q=${searchForCourse}`,
        );
        cy.get("[data-test=search-cmdk-input]").should("not.exist");
        cy.get("[data-test=search-result]").should("have.length.gte", 1);
      });

      it("should be able to search for a professor", function () {
        cy.get("[data-test=search-cmdk-trigger]").should("be.visible").click();
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type(searchForProf);

        cy.get("[data-test=search-cmdk-submit]").click();

        cy.url().should(
          "eq",
          `${Cypress.config("baseUrl")}/search?q=${searchForProf}`,
        );
        cy.get("[data-test=search-cmdk-input]").should("not.exist");
        cy.get("[data-test=search-result]").should("have.length.gte", 1);
      });

      it("should not be able to sql inject", function () {
        cy.get("[data-test=search-cmdk-trigger]").should("be.visible").click();
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type("; SELECT * FROM courses;--");

        cy.get("[data-test=search-cmdk-submit]").click();

        cy.url().should(
          "eq",
          `${Cypress.config("baseUrl")}/search?q=%3B+SELECT+*+FROM+courses%3B--`,
        );
      });

      it("should display not-found if no search results", function () {
        const NONSENSE = "asdfasdfasdf";

        cy.get("[data-test=search-cmdk-trigger]").should("be.visible").click();
        cy.get("input[data-test=search-cmdk-input]")
          .should("be.visible")
          .type(NONSENSE);

        cy.get("[data-test=search-cmdk-submit]").click();

        cy.url().should(
          "eq",
          `${Cypress.config("baseUrl")}/search?q=${NONSENSE}`,
        );
        cy.get("[data-test=search-empty]")
          .should("be.visible")
          .should("contain", "No results found");
      });
    });
  });
});
