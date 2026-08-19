/// <reference types="cypress" />

const TEST_EMAIL_INVALID = "test@test.com";
const TEST_EMAIL_V1_VALID = Cypress.env("TEST_EMAIL_V1_VALID");
const TEST_EMAIL_V2_VALID = Cypress.env("TEST_EMAIL_V2_VALID");

context("ResetPwd", function () {
  beforeEach(function () {
    cy.intercept("POST", "**/auth/v1/recover*", {
      delay: 1000,
      statusCode: 200,
      body: {},
    }).as("mockPasswordReset");
    cy.visit("/account/auth/forgot");
  });

  describe("Successful Password Reset", function () {
    it("should be able to submit password reset request for v1 email", function () {
      cy.get("input[data-test=email]", { timeout: 10000 })
        .should("be.visible")
        .type(TEST_EMAIL_V1_VALID);
      cy.get("button[data-test=submit]")
        .click()
        .should("have.text", "Confirming your email...");
      cy.url({ timeout: 15000 }).should(
        "eq",
        `${Cypress.config("baseUrl")}/account/auth/signup?email=${TEST_EMAIL_V1_VALID}`,
      );
      cy.get("div[data-test=v1-signup-alert-dialog]", { timeout: 10000 }).should(
        "be.visible",
      );
    });

    it("should be able to submit password reset request for v2 email", function () {
      if (!TEST_EMAIL_V2_VALID) {
        cy.log("Skipping v2 reset — CYPRESS_TEST_EMAIL_V2_VALID not set");
        this.skip();
      }
      cy.get("input[data-test=email]", { timeout: 10000 })
        .should("be.visible")
        .type(TEST_EMAIL_V2_VALID);
      cy.get("button[data-test=submit]")
        .click()
        .should("have.text", "Confirming your email...");
      // by this time this should have requsted once
      cy.get("@mockPasswordReset.all").should("have.length", 1);
      cy.wait(10_000);
      cy.url({ timeout: 15000 }).should(
        "eq",
        `${Cypress.config("baseUrl")}/account/auth/verify?email=${TEST_EMAIL_V2_VALID}`,
      );
    });

    it("should be able to navigate to register page and submit password reset request", function () {
      cy.visit("/");

      cy.get("a[data-test=login]", { timeout: 15000 })
        .should("exist")
        .click({ force: true });
      cy.get("a[data-test=forget]", { timeout: 15000 })
        .should("exist")
        .click({ force: true });

      cy.url({ timeout: 15000 }).should(
        "eq",
        `${Cypress.config("baseUrl")}/account/auth/forgot`,
      );
    });
  });

  describe("Incomplete Password Reset", function () {
    it("should warn user to fill in fields", function () {
      cy.get("button[data-test=submit]").click();

      cy.get("button[data-test=submit]", { timeout: 10000 }).should(
        "have.text",
        "Reset my password",
      );

      cy.get("p[data-test=email-helper-text]", { timeout: 10000 }).should(
        "have.text",
        "Email is required",
      );
    });

    it("should warn user to fill in schoool email", function () {
      cy.get("input[data-test=email]", { timeout: 10000 })
        .should("be.visible")
        .type(TEST_EMAIL_INVALID);
      cy.get("button[data-test=submit]").click();

      cy.get("button[data-test=submit]", { timeout: 10000 }).should(
        "have.text",
        "Reset my password",
      );

      cy.get("p[data-test=email-helper-text]", { timeout: 10000 }).should(
        "contain.text",
        "Unsupported email domain, please choose from: ",
      );
    });
  });
});
