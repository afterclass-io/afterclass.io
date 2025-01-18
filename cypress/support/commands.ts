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

const setSessionCookie = (cookie) => {
  if (!cookies) {
    throw new Error("No cookies found in the response");
  }
  if (!Array.isArray(cookies)) {
    throw new Error("Cookies must be an array");
  }

  const sessionCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("authjs.session-token="),
  );
  if (!sessionCookie) {
    throw new Error("No session cookie found in the response");
  }

  const sessionTokenValue = sessionCookie.split(";")[0]!.split("=")[1];

  cy.setCookie("authjs.session-token", sessionTokenValue);
};

// -- This is a parent command --
Cypress.Commands.add("loginWith", ({ email, password }) => {
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
  cy.request("/api/auth/csrf").then((response) => {
    cy.log(`csrf response: ${JSON.stringify(response)}`);
    const csrfToken = response.body.csrfToken;
    cy.log(`csrfToken: ${csrfToken}`);

    // Perform login with credentials
    try {
      cy.request({
        method: "POST",
        url: "/api/auth/callback/credentials",
        form: true,
        body: {
          csrfToken,
          email,
          password,
          json: true,
        },
        followRedirect: false,
      }).then((res) => {
        expect(res.status).to.eq(302);

        const cookies = res.headers["set-cookie"];
        if (!cookies) {
          throw new Error("No cookies found in the response");
        }
        setSessionCookie(cookies);

        cy.reload();
      });
    } catch {
      cy.request("/api/auth/session").then((res) => {
        const cookies = res.headers["set-cookie"];
        if (!cookies) {
          throw new Error("No cookies found in the response");
        }
        setSessionCookie(cookies);

        cy.reload();
      });
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
