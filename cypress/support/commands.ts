/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
Cypress.Commands.add("loginWith", ({ email, password }) => {
  cy.url().then((url) => {
    cy.visit("/account/auth/login");
    cy.get("input[data-test=email]").type(email);
    cy.get("input[data-test=password]").type(password);
    cy.get("button[data-test=submit]").click();
    cy.url().should((url) => expect(url.endsWith("/")).to.be.true);

    if (url.startsWith("http")) {
      cy.visit(url);
      cy.wait(1000);
    }
  });
});

Cypress.Commands.add("login", () => {
  cy.loginWith({
    email: Cypress.env("TEST_EMAIL_V1_VALID"),
    password: Cypress.env("TEST_PWD_VALID"),
  });
});

Cypress.Commands.add(
  "fillReviewSectionFor",
  ({ reviewFor, comboInputValue, comboExpectedValue, body, tips }) => {
    cy.get(
      `[data-test=review-form-${reviewFor}-section] [data-test=combobox-trigger]`,
    )
      .click()
      .get("[data-test=combobox-input]")
      .should("be.visible")
      .type(`${comboInputValue}{enter}`)
      .get(`[data-test=combobox-item-${comboExpectedValue}]`)
      .should("be.visible")
      .click();

    cy.get(`[data-test=review-form-${reviewFor}-rating]`)
      .should("exist")
      .should("have.length", 5)
      .last()
      .parent()
      .click();

    cy.get(`[data-test=review-form-${reviewFor}-label]`)
      .should("exist")
      .should("have.length", 3)
      .last()
      .parent()
      .click();

    cy.get(`[data-test=review-form-${reviewFor}-body]`)
      .should("be.visible")
      .type(body, { delay: 0 });

    cy.get(`[data-test=review-form-${reviewFor}-tips]`)
      .should("be.visible")
      .type(tips, { delay: 0 });
  },
);

//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
//

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
      loginWith(credentials: {
        email: string;
        password: string;
      }): Chainable<void>;
      fillReviewSectionFor(reviewFor: {
        reviewFor: string;
        comboInputValue: string;
        comboExpectedValue: string;
        body: string;
        tips: string;
      }): Chainable<void>;
    }
  }
}
