/// <reference types="cypress" />

const TEST_COURSE_CODE = "COR-IS1702";
const TEST_COURSE_PATH = `/course/${TEST_COURSE_CODE}`;

context("Home", function () {
  beforeEach(function () {
    cy.visit(TEST_COURSE_PATH);
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

    it("should be able to navigate to professor reviews page", function () {
      cy.intercept("GET", "/professor/*").as("navigateToProfessorPage");
      cy.get("a[data-test=review-professor-label]").first().click();
      cy.wait("@navigateToProfessorPage");
      cy.url().should("contain", `${Cypress.config("baseUrl")}/professor/`);
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
        "exist",
      );
    });

    it("should not be able to see reviews ratings", function () {
      cy.get("[data-test=rating-section] [data-test=stats-value]").should(
        "not.exist",
      );
    });

    it("should not be able to open information modal", function () {
      cy.get("[data-test=course-information-modal-trigger]").should(
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
        "/api/trpc/courses.getByCourseCode,reviews.getByCourseCode*",
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
          .get("button[data-test=like-button]")
          .filter("[data-liked=false]")
          .first();

      getFirstUnlikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          getFirstUnlikedBtn()
            .click()
            .should("have.text", initialValueText)
            .should("have.attr", "data-liked", "false");
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
      cy.visit(TEST_COURSE_PATH);
      cy.wait(1_000);
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

    it("should be able to open information modal", function () {
      cy.get("[data-test=course-information-modal-trigger]")
        .should("be.visible")
        .click();
      cy.get("[data-test=course-information-modal]").should("be.visible");
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
          .get("button[data-test=like-button]")
          .filter("[data-liked=false]")
          .first();

      getFirstUnlikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          const initialValue = parseInt(initialValueText, 10);

          getFirstUnlikedBtn()
            .click()
            .should("have.text", initialValue + 1)
            .should("have.attr", "data-liked", "true");
        });
    });

    it("should be able to unlike a review", function () {
      const getFirstLikedBtn = () =>
        cy
          .get("button[data-test=like-button]")
          .filter("[data-liked=true]")
          .first();

      getFirstLikedBtn()
        .invoke("text")
        .then((initialValueText) => {
          const initialValue = parseInt(initialValueText, 10);

          getFirstLikedBtn()
            .click()
            .should("have.text", initialValue - 1)
            .should("have.attr", "data-liked", "false");
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
      cy.wait(1_000);
      cy.fixture("prisma/3_courses.json").then((courses) => {
        this.courseJson = courses;
        this.course = courses.find((c) => c.code === TEST_COURSE_CODE);
      });

      cy.fixture("prisma/7_classes.json").then((classes) => {
        const classesOfThisCourse = classes.filter(
          (c) => c.courseId === this.course.id,
        );
        const selectClassesWithUniqueProfessor = classesOfThisCourse.filter(
          (obj1, i, arr) =>
            arr.findIndex((obj2) => obj2.professorId === obj1.professorId) ===
            i,
        );
        this.numProfOfThisCourse = selectClassesWithUniqueProfessor.length;
      });
    });

    it("should display accurate course information", function () {
      cy.get("[data-test=page-title]").should("contain.text", this.course.name);

      // information section detail card
      cy.get("[data-test=course-code]").should(
        "contain.text",
        this.course.code,
      );
      cy.get("[data-test=course-credit]").should(
        "contain.text",
        this.course.creditUnits,
      );

      // information section information card
      cy.get("[data-test=course-description]").should(
        "contain.text",
        this.course.description,
      );
      cy.get("[data-test=course-information-modal-trigger]").click();
      cy.get("[data-test=course-information-modal-body]")
        .should("be.visible")
        .should("contain.text", this.course.description)
        .type("{esc}");

      cy.get("[data-test=course-information-modal-body]").should("not.exist");

      // filter section
      cy.get(
        "[data-test=filter-toggle-section] [data-test=filter-item]",
      ).should("be.visible");
    });

    it("should display accurate professor information", function () {
      cy.get("[data-test=filter-toggle-section] [data-test=filter-item]")
        .should("have.length", this.numProfOfThisCourse)
        .each(($el) => {
          cy.wrap($el)
            .click()
            .find("[data-test=filter-item-value]")
            .first()
            .invoke("text")
            .then((thisFilteredProfReviewCount) => {
              cy.wait(1_000);
              cy.get("[data-test=scrollable]").scrollTo("bottom");
              cy.get("[data-test=review-professor-label]").should(
                "have.length",
                thisFilteredProfReviewCount,
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
      ).should("contain.text", "3.73");
      cy.get("[data-test=rating-interesting] [data-test=stats-value]").should(
        "contain.text",
        "4%",
      );
      cy.get("[data-test=rating-practical] [data-test=stats-value]").should(
        "contain.text",
        "4%",
      );
      cy.get(
        "[data-test=rating-gained-new-skills] [data-test=stats-value]",
      ).should("contain.text", "4%");
    });

    it("should display accurate review counts", function () {
      // reviews - // TODO make this dynamic
      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.get("[data-test=scrollable]").scrollTo("bottom");
      cy.get("[data-test=review]").should("have.length", 20);
    });
  });
});
