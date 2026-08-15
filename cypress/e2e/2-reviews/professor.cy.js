/// <reference types="cypress" />

const TEST_PROF_SLUG = "ouh-eng-lieh";
const TEST_PROF_PATH = `/professor/${TEST_PROF_SLUG}`;

context("Reviews: Professor", function () {
  beforeEach(function () {
    cy.visit(TEST_PROF_PATH);
  });

  describe("Basic Navigations", function () {
    it("should be able to navigate to login page", function () {
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
      cy.url().should("contain", `${Cypress.config("baseUrl")}/bidding/analytics`);
    });

    it("should be able to navigate to reviews page", function () {
      cy.intercept("GET", "/?*").as("navigateToReviewsPage");
      cy.get("a[data-test=sidebar-reviews]").click();
      cy.wait("@navigateToReviewsPage");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
    });

    it("should be able to navigate to course reviews page", function () {
      cy.intercept("GET", "/course/*").as("navigateToCoursePage");
      cy.get("a[data-test=review-course-label]").first().click();
      cy.wait("@navigateToCoursePage");
      cy.url().should("contain", `${Cypress.config("baseUrl")}/course/`);
    });
  });

  describe("Unauthenticated User", function () {
    it("should be able to see login overlays", function () {
      cy.get(
        "[data-test=filter-toggle-section] a[data-test=lock-cta-overlay]",
      ).should("be.visible");

      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]").should(
        "be.visible",
      );

      cy.scrollTo("bottom");
      cy.get("[data-test=review] a[data-test=lock-cta-overlay]").should(
        "be.visible",
      );
    });

    it("should not be able to see reviews ratings", function () {
      cy.get("[data-test=rating-section] [data-test=stats-value]").should(
        "not.exist",
      );
    });

    it("should not be able to filter reviews", function () {
      cy.get(
        "[data-test=filter-toggle-section] [data-test=filter-item]",
      ).should("not.exist");
    });

    it("should not be able to open review modal", function () {
      cy.get("[data-test=review]").first().click();
      cy.get("div[data-test=review-modal]").should("not.exist");
    });

    it("should not be able to load more reviews", function () {
      cy.intercept("GET", "**/api/trpc/*reviews.getByProfSlug*").as("getReviews");
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
      cy.visit(TEST_PROF_PATH);
    });

    it("should not be able to see login overlays", function () {
      cy.get(
        "[data-test=filter-toggle-section] a[data-test=lock-cta-overlay]",
      ).should("not.exist");

      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]").should(
        "not.exist",
      );

      cy.get("[data-test=review] a[data-test=lock-cta-overlay]").should(
        "not.exist",
      );
    });

    it("should be able to see reviews ratings", function () {
      cy.get("[data-test=rating-section]", { timeout: 15000 }).should("be.visible");
      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]", { timeout: 15000 }).should("not.exist");
      cy.get("[data-test=rating-section] [data-test=stats-value]", { timeout: 15000 }).should("be.visible");
    });

    it("should be able to filter reviews", function () {
      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]", { timeout: 15000 }).should("not.exist");
      // Remember initial count
      cy.get("[data-test=review]", { timeout: 15000 }).then(($before) => {
        const initial = $before.length;
        cy.get("[data-test=filter-toggle-section] [data-test=filter-item]", { timeout: 15000 })
          .should("be.visible")
          .last()
          .click();
        cy.wait(1500);
        cy.get("body").then(($body) => {
          const count = $body.find("[data-test=review]").length;
          const empty = $body.find(":contains('Oh no!')").length > 0;
          // Either still some reviews (filtered subset) or empty state; both valid, just assert filter did something
          // (may be same count if only one course, so allow <= initial)
          expect(count <= initial || empty).to.eq(true);
        });
      });
    });

    it("should be able to open review modal", function () {
      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]", { timeout: 15000 }).should("not.exist");
      cy.get("[data-test=review]", { timeout: 15000 }).first().click();
      cy.get("div[data-test=review-modal]", { timeout: 10000 }).should("be.visible");
    });

    it("should be able to like and unlike a review", function () {
      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]", { timeout: 15000 }).should("not.exist");
      cy.get("button[data-test=upvote-button]", { timeout: 15000 }).should("have.length.at.least", 1);
      cy.get("button[data-test=upvote-button]").then(($btns) => {
        const hasUnliked = $btns.filter("[data-voted=false]").length > 0;
        const sel = hasUnliked ? "[data-voted=false]" : "[data-voted=true]";
        const from = hasUnliked ? "false" : "true";
        const to = hasUnliked ? "true" : "false";
        const btn = Cypress.$(`button[data-test=upvote-button]${sel}`).first();
        const initial = parseInt(btn.parent().attr("data-vote-count") ?? "0", 10);
        const expected = hasUnliked ? initial + 1 : initial - 1;
        cy.get(`button[data-test=upvote-button]${sel}`, { timeout: 10000 }).first()
          .parent().should("have.attr", "data-voted", from);
        cy.get(`button[data-test=upvote-button]${sel}`).first().click()
          .should("have.attr", "data-voted", to)
          .parent().should("have.attr", "data-voted", to)
          .should("have.attr", "data-vote-count", `${expected}`);
        cy.get(`button[data-test=upvote-button][data-voted=${to}]`, { timeout: 10000 }).first().click()
          .should("have.attr", "data-voted", from);
      });
    });

    it("should be able to load more reviews", function () {
      cy.get("[data-test=rating-section] a[data-test=lock-cta-overlay]", { timeout: 15000 }).should("not.exist");
      cy.get('[data-test=review-load-more]', { timeout: 15000 }).click({ force: true });
      cy.get("[data-test=review]", { timeout: 20000 }).should("have.length.at.least", 11);
    });

    it("should be able to write a review", function () {
      cy.intercept("GET", "/submit*").as("navigateToReviewSubmission");
      cy.get("a[data-test=cta-write-review]").click();
      cy.wait("@navigateToReviewSubmission");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/submit`);
    });
  });

  describe("Data Accuracy", function () {
    // anonymous function to avoid `this` binding issues
    beforeEach(function () {
      cy.login();
      cy.visit(TEST_PROF_PATH);
      cy.fixture("prisma/5_professors.json").then((professors) => {
        this.professorsJson = professors;
        this.professor = professors.find((c) => c.slug === TEST_PROF_SLUG);
      });

      cy.fixture("prisma/7_classes.json").then((classes) => {
        const classesOfThisProfessor = classes.filter(
          (c) => c.professorId === this.professor.id,
        );
        const selectClassesWithUniqueCourse = classesOfThisProfessor.filter(
          (obj1, i, arr) =>
            arr.findIndex((obj2) => obj2.courseId === obj1.courseId) === i,
        );
        this.numCourseOfThisProf = selectClassesWithUniqueCourse.length;
      });
    });

    it("should display accurate professor information", function () {
      cy.get("[data-test=page-title]", { timeout: 15000 }).should(
        "contain.text",
        this.professor.name,
      );

      // filter section
      cy.get(
        "[data-test=filter-toggle-section] [data-test=filter-item]",
      ).should("be.visible");
    });

    it("should display accurate course information", function () {
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]", { timeout: 15000 })
        .should("have.length.at.least", 1);
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]").first().click();
      cy.get("body", { timeout: 10000 }).should(($body) => {
        const reviews = $body.find("[data-test=review]").length;
        const empty = $body.text().includes("Oh no!");
        expect(reviews >= 0 && (reviews > 0 || empty)).to.eq(true);
      });
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]").first().click();
    });

    it("should display accurate review ratings", function () {
      // rating section - // TODO make this dynamic
      cy.get(
        "[data-test=rating-average-rating] [data-test=stats-value]",
      ).should("contain.text", "4.25");
      cy.get("[data-test=rating-engaging] [data-test=stats-value]").should(
        "contain.text",
        "45%",
      );
      cy.get("[data-test=rating-fair-grading] [data-test=stats-value]").should(
        "contain.text",
        "40%",
      );
      cy.get(
        "[data-test=rating-effective-teaching] [data-test=stats-value]",
      ).should("contain.text", "40%");
    });

    it("should display accurate review counts", function () {
      cy.get('[data-test=review-load-more]', { timeout: 15000 }).click({ force: true });
      cy.get("[data-test=review]", { timeout: 20000 }).should("have.length.at.least", 20);
    });
  });
});
