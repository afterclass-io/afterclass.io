/// <reference types="cypress" />
import type { HttpRequestInterceptor } from "cypress/types/net-stubbing";

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
    // NextAuth finalizes the session cookie after the redirect; wait for it
    cy.getCookies().should((cookies) => {
      expect(
        cookies.some((cookie) => cookie.name.endsWith("session-token")),
        "session cookie is set",
      ).to.eq(true);
    });
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

/**
 * Clicks a section action (add or swap) and waits for its outcome: a finished
 * slot mutation, or the client-side "Time conflict" toast. On a conflict it
 * clicks the fallback section and waits for that mutation to finish.
 * Pass the indexes of the primary and fallback section actions.
 */
Cypress.Commands.add(
  "pickSectionWithFallback",
  ({ primary, fallback }: { primary: number; fallback: number }) => {
    let finishedMutations = 0;
    const countFinished: HttpRequestInterceptor = (req) => {
      req.on("response", () => {
        finishedMutations += 1;
      });
    };
    cy.intercept("POST", "**/api/trpc/*timetable.addSlot*", countFinished);
    cy.intercept(
      "POST",
      "**/api/trpc/*timetable.setSlotSection*",
      countFinished,
    );

    cy.get("[data-test^=timetable-section-action-]").eq(primary).click();
    cy.get("body").should(($body) => {
      expect(
        finishedMutations > 0 || $body.text().includes("Time conflict"),
        "slot mutation finished or time conflict shown",
      ).to.eq(true);
    });
    cy.get("body").then(($body) => {
      if (finishedMutations === 0 && $body.text().includes("Time conflict")) {
        cy.get("[data-test^=timetable-section-action-]")
          .eq(fallback)
          .click({ force: true });
        cy.get("body").should(() => {
          expect(finishedMutations, "fallback slot mutation finished").to.be.gt(
            0,
          );
        });
      }
    });
  },
);

/**
 * Waits until React has hydrated every `[data-test]` element on the page.
 * The server renders review lists, buttons and links into the HTML, so
 * Cypress can click them before their handlers exist, and the click does
 * nothing. React tags each DOM node it manages with a `__reactFiber$` key
 * when it hydrates the node, so a node without the key has no handlers yet.
 * Call it after `cy.visit()` or any login that lands on a page you then use.
 */
Cypress.Commands.add("waitForHydration", () => {
  cy.get("[data-test]", { timeout: 20000 }).should(($elements) => {
    const unhydrated = $elements
      .toArray()
      .filter(
        (element) =>
          !Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
      )
      .map((element) => element.getAttribute("data-test"));
    expect(unhydrated, "data-test elements React has not hydrated").to.deep.eq(
      [],
    );
  });
});

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
      pickSectionWithFallback(sections: {
        primary: number;
        fallback: number;
      }): Chainable<void>;
      checkOgImage(): Chainable<void>;
      waitForHydration(): Chainable<void>;
    }
  }
}
