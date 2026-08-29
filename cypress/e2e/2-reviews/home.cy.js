/// <reference types="cypress" />

context("Reviews: Home", function () {
  beforeEach(function () {
    cy.visit("/");
  });

  describe("Basic Navigations", function () {
    it("should be able to navigate to login page and login", function () {
      cy.intercept("GET", "/account/auth/login*").as("navigateToLoginPage");
      cy.get("a[data-test=login]").click();
      cy.wait("@navigateToLoginPage");
      cy.url().should(
        "include",
        `${Cypress.config("baseUrl")}/account/auth/login`,
      );
    });

    it("should be able to navigate to bid analytics page", function () {
      cy.intercept("GET", "/bidding/analytics*").as("navigateToBiddingPage");
      cy.get("a[data-test=sidebar-bid-analytics]").click();
      cy.wait("@navigateToBiddingPage");
      cy.url().should(
        "contain",
        `${Cypress.config("baseUrl")}/bidding/analytics`,
      );
    });

    it("should be able to navigate to course reviews page", function () {
      cy.intercept("GET", "/course/*").as("navigateToCoursePage");
      cy.get("a[data-test=review-course-label]").first().click();
      cy.wait("@navigateToCoursePage");
      cy.url().should("contain", `${Cypress.config("baseUrl")}/course/`);
    });

    it("should be able to navigate to professor reviews page", function () {
      cy.intercept("GET", "/professor/*").as("navigateToProfessorPage");
      cy.get("a[data-test=review-professor-label]").first().click();
      cy.wait("@navigateToProfessorPage");
      cy.url().should("contain", `${Cypress.config("baseUrl")}/professor/`);
    });
  });

  describe("Unauthenticated User", function () {
    it("should be able to see login overlay on review item", function () {
      cy.scrollTo("bottom");

      cy.get("a[data-test=lock-cta-overlay]").should("be.visible");
    });

    it("should not be able to open review modal", function () {
      cy.get("[data-test=review]").first().click();
      cy.get("div[data-test=review-modal]").should("not.exist");
    });

    it("should not be able to load more reviews", function () {
      cy.intercept("GET", "**/api/trpc/*reviews.getAll*").as("getReviews");
      cy.wait("@getReviews");

      cy.scrollTo("bottom");
      cy.wait(2000);

      cy.get("[data-test=review]").should("have.length", 10);
    });

    it("should not be able to navigate to review submission", function () {
      cy.get("a[data-test=cta-write-review]").click();
      cy.url().should(
        "include",
        `${Cypress.config("baseUrl")}/account/auth/login`,
      );
    });
  });

  describe("Authenticated User", function () {
    beforeEach(function () {
      cy.login();
    });

    it("should not be able to see login overlay on review item", function () {
      cy.get("a[data-test=lock-cta-overlay]").should("not.exist");
    });

    it("should be able to open review modal", function () {
      cy.get("[data-test=review]").first().click();
      cy.get("div[data-test=review-modal]").should("be.visible");
    });

    it("should be able to like and unlike a review", function () {
      // State may carry over (previous unlike leaves no [data-voted=false]).
      // Do like + unlike in one test so order doesn't interleave.
      cy.get("button[data-test=upvote-button]").should(
        "have.length.at.least",
        1,
      );
      cy.get("button[data-test=upvote-button]", { timeout: 10000 }).should(
        "exist",
      );
      // Pick whichever state exists first, then round-trip it.
      cy.get("button[data-test=upvote-button]").then(($btns) => {
        const hasUnliked = $btns.filter("[data-voted=false]").length > 0;
        const sel = hasUnliked ? "[data-voted=false]" : "[data-voted=true]";
        const from = hasUnliked ? "false" : "true";
        const to = hasUnliked ? "true" : "false";
        const btn = Cypress.$(`button[data-test=upvote-button]${sel}`).first();
        const initial = parseInt(
          btn.parent().attr("data-vote-count") ?? "0",
          10,
        );
        const expected = hasUnliked ? initial + 1 : initial - 1;
        cy.get(`button[data-test=upvote-button]${sel}`)
          .first()
          .parent()
          .should("have.attr", "data-voted", from);
        cy.get(`button[data-test=upvote-button]${sel}`)
          .first()
          .click()
          .should("have.attr", "data-voted", to)
          .parent()
          .should("have.attr", "data-voted", to)
          .should("have.attr", "data-vote-count", `${expected}`);
        // Undo to leave clean state for next run.
        cy.get(`button[data-test=upvote-button][data-voted=${to}]`)
          .first()
          .click()
          .should("have.attr", "data-voted", from);
      });
    });

    it("should be able to load more reviews", function () {
      cy.get("[data-test=review-load-more]", { timeout: 15000 }).click({
        force: true,
      });
      cy.get("[data-test=review]", { timeout: 20000 }).should(
        "have.length.at.least",
        11,
      );
    });

    it("should be able to write a review", function () {
      cy.intercept("GET", "/submit*").as("navigateToReviewSubmission");
      cy.get("a[data-test=cta-write-review]").click();
      cy.wait("@navigateToReviewSubmission");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/submit`);
    });
  });
});
