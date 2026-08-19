/// <reference types="cypress" />

/**
 * "Add to calendar" calendar-export E2E tests
 *
 * Covers the inline link-sharing enablement flow:
 *   1. Login
 *   2. Navigate to /timetable and select a term (creates/loads a timetable)
 *   3. Reset the timetable to PRIVATE via the Share dialog (keeps this spec
 *      order-independent — a previous run may have left it UNLISTED)
 *   4. Open "Add to calendar" → the token mint is refused for a PRIVATE
 *      timetable → the inline "Turn on link sharing" notice appears (no
 *      dead-end error toast)
 *   5. Click "Turn on link sharing" → the iCal token is minted and the
 *      subscribe/copy/download controls appear, with no error toast
 */

context("Timetable: Calendar export", function () {
  beforeEach(function () {
    cy.login();
    // Prevent the product tour from auto-starting and blocking the UI.
    cy.window().then((win) => {
      win.localStorage.setItem("hasSeenTimetableTour", JSON.stringify(true));
      win.localStorage.setItem("hasSeenRoadmapsTour", JSON.stringify(true));
    });
    cy.visit("/timetable");
  });

  it("offers to turn on link sharing inline when the timetable is private", function () {
    // Select a term so an active timetable exists.
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-slot=select-item]").first().click();

    // Wait for the timetable to load (variant switcher + Share button appear).
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get("[data-test=share-button]", { timeout: 10000 }).should("be.visible");

    // Reset the timetable to PRIVATE via the Share dialog so the token mint
    // below is refused regardless of earlier spec runs (this also clears any
    // previously minted iCal token).
    cy.intercept("POST", "**/api/trpc/sharing.setVisibility*").as(
      "resetVisibility",
    );
    cy.get("[data-test=share-button]").click();
    cy.get('label[for="share-visibility-PRIVATE"]').click();
    cy.get("[data-test=share-save]").click();
    cy.wait("@resetVisibility");

    // Open "Add to calendar": the first mint is refused for a PRIVATE
    // timetable, so the inline "Turn on link sharing" notice appears instead
    // of a dead-end error toast.
    cy.get("[data-test=calendar-export-button]").click();
    cy.get("[data-test=calendar-needs-link-sharing]", { timeout: 10000 })
      .should("be.visible")
      .and("contain.text", "link-sharing");

    // Intercept the enable flow (registered after the refused first mint, so
    // the waits below only capture the retry requests), then turn it on.
    cy.intercept("POST", "**/api/trpc/sharing.setVisibility*").as(
      "enableVisibility",
    );
    cy.intercept("POST", "**/api/trpc/timetable.getOrCreateIcalToken*").as(
      "mintToken",
    );
    cy.get("[data-test=calendar-turn-on-link-sharing]").click();

    // Wait for visibility to flip to UNLISTED and the token to be minted.
    cy.wait("@enableVisibility");
    cy.wait("@mintToken");

    // The subscribe/copy/download controls appear, with no error toast.
    cy.get("[data-test=calendar-feed-url]").should("be.visible");
    cy.get("[data-test=calendar-copy-subscribe]").should("be.visible");
    cy.get("[data-test=calendar-subscribe-google]").should("be.visible");
    cy.get("[data-test=calendar-subscribe-apple]").should("be.visible");
    cy.get("[data-test=calendar-subscribe-outlook]").should("be.visible");
    cy.get("[data-test=calendar-download-ics]").should("be.visible");
    cy.get("[data-sonner-toast]").should("not.exist");
  });
});
