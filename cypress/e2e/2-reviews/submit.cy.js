/// <reference types="cypress" />

const TEST_COURSE_CODE = "SE101";
const TEST_PROF_SLUG = "swavek-wlodkowski";

context("Reviews: Submit", function () {
  beforeEach(function () {
    cy.login();
    cy.visit("/submit");
    cy.fixture("prisma/3_courses.json").then((courses) => {
      this.courseJson = courses;
      this.course = courses.find((c) => c.code === TEST_COURSE_CODE);
    });

    cy.fixture("prisma/5_professors.json").then((professors) => {
      this.professorsJson = professors;
      this.professor = professors.find((c) => c.slug === TEST_PROF_SLUG);
    });

    cy.fixture("prisma/7_classes.json").then((classes) => {
      const classesOfThisCourse = classes.filter(
        (c) => c.courseId === this.course.id,
      );
      const selectClassesWithUniqueProfessor = classesOfThisCourse.filter(
        (obj1, i, arr) =>
          arr.findIndex((obj2) => obj2.professorId === obj1.professorId) === i,
      );
      this.numProfOfThisCourse = selectClassesWithUniqueProfessor.length;

      const classesOfThisProfessor = classes.filter(
        (c) => c.professorId === this.professor.id,
      );
      const selectClassesWithUniqueCourse = classesOfThisProfessor.filter(
        (obj1, i, arr) =>
          arr.findIndex((obj2) => obj2.courseId === obj1.courseId) === i,
      );
      this.numCourseOfThisProf = selectClassesWithUniqueCourse.length;
    });

    cy.fixture("prisma/9_reviews.json").then((reviews) => {
      this.reviewsJson = reviews;
    });
  });

  describe("Basic Navigations", function () {
    it("should be able to navigate to bid analytics page", function () {
      cy.intercept("GET", "/bidding*").as("navigateToBiddingPage");
      cy.get("a[data-test=sidebar-bid-analytics]").click();
      cy.wait("@navigateToBiddingPage");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/bidding`);
    });

    it("should be able to navigate to reviews page", function () {
      cy.intercept("GET", "/bidding*").as("navigateToBiddingPage");
      cy.get("a[data-test=sidebar-bid-analytics]").click();
      cy.wait("@navigateToBiddingPage");
      cy.url().should("eq", `${Cypress.config("baseUrl")}/bidding`);
    });
  });

  describe("Review Submission", function () {
    before(function () {
      if (Cypress.env("TEST_REVIEW_SUBMISSION") !== "true") {
        this.skip();
      }
    });

    it("should be able to submit a course review", function () {
      cy.fillReviewSectionFor({
        reviewFor: "course",
        comboInputValue: this.course.code,
        comboExpectedValue: this.course.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.get("[data-test=review-form-professor-toggle-skip]").click();

      cy.get("[data-test=review-submit-button]").click();

      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
      cy.get("[data-test=review]")
        .first()
        .should("contain.text", this.course.code)
        .should("contain.text", this.reviewsJson[0].body);
    });

    it("should be able to submit a course review anonymously", function () {
      cy.fillReviewSectionFor({
        reviewFor: "course",
        comboInputValue: this.course.code,
        comboExpectedValue: this.course.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.get("[data-test=review-form-professor-toggle-skip]").click();

      cy.get("[data-test=review-submit-select-trigger]")
        .click()
        .get("[data-test=review-submit-select-anon]")
        .should("be.visible")
        .click();
      cy.get("[data-test=review-submit-button]").click();

      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
      cy.get("[data-test=review]")
        .first()
        .should("contain.text", this.course.code)
        .should("contain.text", this.reviewsJson[0].body);
    });

    it("should be able to submit a course & professor review", function () {
      cy.fillReviewSectionFor({
        reviewFor: "course",
        comboInputValue: this.course.code,
        comboExpectedValue: this.course.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.fillReviewSectionFor({
        reviewFor: "professor",
        comboInputValue: this.professor.name,
        comboExpectedValue: this.professor.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.get("[data-test=review-submit-button]").click();

      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
      cy.get("[data-test=review]")
        .first()
        .should("contain.text", this.course.code)
        .should("contain.text", this.reviewsJson[0].body);
    });

    it("should be able to submit a course & professor review anonymously", function () {
      cy.fillReviewSectionFor({
        reviewFor: "course",
        comboInputValue: this.course.code,
        comboExpectedValue: this.course.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.fillReviewSectionFor({
        reviewFor: "professor",
        comboInputValue: this.professor.name,
        comboExpectedValue: this.professor.id,
        body: this.reviewsJson[0].body,
        tips: this.reviewsJson[0].body,
      });

      cy.get("[data-test=review-submit-select-trigger]")
        .click()
        .get("[data-test=review-submit-select-anon]")
        .should("be.visible")
        .click();
      cy.get("[data-test=review-submit-button]").click();

      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
      cy.get("[data-test=review]")
        .first()
        .should("contain.text", this.course.code)
        .should("contain.text", this.reviewsJson[0].body);
    });
  });
});
