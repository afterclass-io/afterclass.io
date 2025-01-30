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
      cy.intercept("GET", "/bidding*").as("navigateToBiddingPage");
      cy.get("a[data-test=sidebar-bid-analytics]").click();
      cy.wait("@navigateToBiddingPage");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/bidding`);
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

      cy.get("[data-test=scrollable]").scrollTo("bottom");
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
      cy.intercept(
        "GET",
        "/api/trpc/professors.getBySlug,reviews.getByProfSlug*",
      ).as("getReviews");
      cy.wait("@getReviews");

      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.wait(2000);

      cy.get("[data-test=review]").should("have.length", 10);
    });

    it("should not be able to like a review", function () {
      cy.wait(1000);

      const getFirstUnlikedBtn = () =>
        cy
          .get("button[data-test=upvote-button]")
          .filter("[data-voted=false]")
          .first();

      getFirstUnlikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          getFirstUnlikedBtn()
            .click()
            .should("have.text", initialValueText)
            .should("have.attr", "data-voted", "false");
        });
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
      cy.get("[data-test=rating-section] [data-test=stats-value]").should(
        "be.visible",
      );
    });

    it("should be able to filter reviews", function () {
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]")
        .should("be.visible")
        .last()
        .click();
      cy.get("[data-test=reviews]").should("have.length.lt", 10);
    });

    it("should be able to open review modal", function () {
      cy.get("[data-test=review]").first().click();
      cy.get("div[data-test=review-modal]").should("be.visible");
    });

    it("should be able to like a review", function () {
      const getFirstUnlikedBtn = () =>
        cy
          .get("button[data-test=upvote-button]")
          .filter("[data-voted=false]")
          .first();

      getFirstUnlikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          const initialValue = parseInt(initialValueText, 10);

          getFirstUnlikedBtn()
            .click()
            .should("have.text", initialValue + 1)
            .should("have.attr", "data-voted", "true");
        });
    });

    it("should be able to unlike a review", function () {
      const getFirstLikedBtn = () =>
        cy
          .get("button[data-test=upvote-button]")
          .filter("[data-voted=true]")
          .first();

      getFirstLikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          const initialValue = parseInt(initialValueText, 10);

          getFirstLikedBtn()
            .click()
            .should("have.text", initialValue - 1)
            .should("have.attr", "data-voted", "false");
        });
    });

    it("should be able to load more reviews", function () {
      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.wait(1000);

      cy.get("[data-test=review]").should("have.length", 20);
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
      cy.get("[data-test=page-title]").should(
        "contain.text",
        this.professor.name,
      );

      // filter section
      cy.get(
        "[data-test=filter-toggle-section] [data-test=filter-item]",
      ).should("be.visible");
    });

    it("should display accurate course information", function () {
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]")
        .should("have.length", this.numCourseOfThisProf)
        .each(($el) => {
          cy.wrap($el)
            .click()
            .find("[data-test=filter-item-value]")
            .first()
            .invoke("text")
            .then((thisFilteredCourseReviewCount) => {
              cy.wait(1_000);
              cy.get("[data-test=scrollable]").scrollTo("bottom");
              cy.get("[data-test=review-course-label]").should(
                "have.length",
                thisFilteredCourseReviewCount,
              );
            });
          // undo the filter
          cy.wrap($el).click();
        });
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
      // reviews - // TODO make this dynamic
      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.get("[data-test=review]").should("have.length", 20);
    });
  });
});
