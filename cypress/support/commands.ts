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
Cypress.Commands.add(
  "loginWith",
  ({ email, password }: { email: string; password: string }) => {
    cy.visit("/account/auth/login");
    cy.get("input[data-test=email]", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(email);
    cy.get("input[data-test=password]", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(password);
    cy.get("button[data-test=submit]", { timeout: 10000 })
      .should("be.visible")
      .click();
    // Wait for successful login: the URL must not be the login page anymore
    cy.url({ timeout: 15000 }).should("not.include", "/account/auth/login");
    // Give NextAuth a moment to finalize the session cookie
    cy.wait(800);
  },
);

Cypress.Commands.add("login", () => {
  const email = Cypress.env("TEST_EMAIL_V1_VALID") as string;
  const password = Cypress.env("TEST_PWD_VALID") as string;
  cy.loginWith({ email, password });
});

Cypress.Commands.add(
  "fillReviewSectionFor",
  ({
    reviewFor,
    comboInputValue,
    comboExpectedValue,
    body,
    tips,
  }: {
    reviewFor: string;
    comboInputValue: string;
    comboExpectedValue: string;
    body: string;
    tips: string;
  }) => {
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

Cypress.Commands.add("checkOgImage", () => {
  // Assert against the raw response, not the hydrated DOM: with per-route
  // generateMetadata the image tag is streamed and moved into <head> after
  // hydration, where cy.get("head meta[...]") does not reliably see it. A
  // crawler reads the raw HTML anyway (see the SEO e2e seam).
  cy.location("pathname").then((pathname) => {
    cy.request(pathname)
      .its("body")
      .then((body: string) => {
        const tagMatch = /<meta[^>]*property="og:image"[^>]*\/?>/.exec(
          String(body),
        );
        const tag = tagMatch ? tagMatch[0] : "";
        const contentMatch = /content="([^"]+)"/.exec(tag);
        const matchedHref = contentMatch ? contentMatch[1] : undefined;
        const href = matchedHref ?? "";
        expect(href, "og:image meta present in raw HTML").to.not.equal("");
        const ogUrl = new URL(
          href,
          Cypress.config("baseUrl") ?? undefined,
        ).toString();
        cy.request(ogUrl).its("status").should("eq", 200);
      });
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress docs prescribe `declare global { namespace Cypress }` for custom commands
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
      checkOgImage(): Chainable<void>;
    }
  }
}
