/// <reference types="cypress" />

/**
 * Timetable bid table and grid E2E tests
 *
 * Covers the full timetable lifecycle:
 *   1. Login
 *   2. Navigate to /timetable
 *   3. Select an academic term
 *   4. Search for a course
 *   5. Add a section to the timetable
 *   6. Verify grid shows the course
 *   7. Reload → persistence check
 *   8. Create a second variant → verify independence
 *   9. Switch back → verify original course is still present
 */

context("Timetable: Build", function () {
  // -------------------------------------------------------------------------
  // Setup: login & navigate to /timetable before every test
  // -------------------------------------------------------------------------
  beforeEach(function () {
    cy.login();
    cy.visit("/timetable");
  });

  // -------------------------------------------------------------------------
  // 1. Page loads with term picker visible
  // -------------------------------------------------------------------------
  it("should display the term picker on load", function () {
    cy.get("[data-test=timetable-term-picker]").should("be.visible");
    cy.contains("Pick a term…").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 2. Select a term → variant is created & search panel appears
  // -------------------------------------------------------------------------
  it("should select a term and auto-create a default timetable variant", function () {
    // Open the term picker
    cy.get("[data-test=timetable-term-picker]").click();

    // Pick the first available term
    cy.get("[data-slot=select-item]").first().click();

    // After auto-creation, the variant switcher should be visible
    // and a default timetable name (e.g. "My Timetable") should appear
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 })
      .should("be.visible");

    // The search panel should now be enabled (no longer showing "Pick a term to start searching")
    cy.get("[data-test=timetable-search-input]").should("not.be.disabled");
  });

  // -------------------------------------------------------------------------
  // 3. Search for a course → see results → expand sections
  // -------------------------------------------------------------------------
  it("should search for a course and display results", function () {
    // Select a term first
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-slot=select-item]").first().click();

    // Wait for the search input to be enabled
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled");

    // Type a search query (use a partial course code that should match
    // something in the seed data, e.g. "COR-" or "ACCT")
    cy.get("[data-test=timetable-search-input]").type("COR-");

    // Wait for debounce + API response – results should appear
    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    // Click the first result to expand its sections
    cy.get("button")
      .filter((_index, el) => {
        // Each search-result button shows a course code, name, and CU count
        // We identify them by checking for the credit-units suffix "CU"
        return Cypress.$(el).text().includes("CU");
      })
      .first()
      .click();

    // The "Sections" heading and add/swap buttons should appear
    cy.contains("Sections").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 4. Add a section to the timetable & verify it appears on the grid
  // -------------------------------------------------------------------------
  it("should add a course section to the timetable and see it on the grid", function () {
    // Select a term
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-slot=select-item]").first().click();

    // Wait for search input
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");

    // Wait for results
    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    // Click the first result
    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    // Find the first "Add" button among the sections and click it
    cy.contains("button", "Add").first().click();

    // After adding, the grid should appear with the course slot
    cy.get("[data-test=timetable-grid]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Verify the grid contains the added course (course code should appear
    // in a TimetableSlotCard)
    cy.get("[data-test=timetable-grid]").should("not.be.empty");
  });

  // -------------------------------------------------------------------------
  // 5. Reload → course persists
  // -------------------------------------------------------------------------
  it("should persist the added course after page reload", function () {
    // Select a term & add a course (same flow as above)
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-slot=select-item]").first().click();

    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");

    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    cy.contains("button", "Add").first().click();

    // Wait for the grid to appear
    cy.get("[data-test=timetable-grid]", { timeout: 10000 }).should(
      "be.visible",
    );

    // ---- Reload ----
    cy.reload();

    // After reload, the term should still be selected and the grid should
    // still show the course
    cy.get("[data-test=timetable-grid]", { timeout: 15000 }).should(
      "be.visible",
    );
    cy.get("[data-test=timetable-grid]").should("not.be.empty");
  });

  // -------------------------------------------------------------------------
  // 6. Create a second variant, switch to it → empty, switch back → course present
  // -------------------------------------------------------------------------
  it("should keep variants independent: second variant empty, first retains courses", function () {
    // ---- Select term ----
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-slot=select-item]").first().click();

    // Wait for variant switcher to appear
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 })
      .should("be.visible");

    // ---- Add a course to the first (default) variant ----
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");

    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    cy.contains("button", "Add").first().click();

    // Wait for grid
    cy.get("[data-test=timetable-grid]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Remember the current variant name / slot count for later assertion
    cy.get("[data-test=timetable-variant-switcher]")
      .invoke("text")
      .as("variant1Name");

    // ---- Create a second variant ----
    cy.get("[data-test=timetable-variant-create]").click();

    // Wait for the new variant to be created (the switcher value should change)
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 })
      .should("be.visible");

    // ---- Verify the second variant is empty ----
    // The grid should show the empty state ("No classes added yet")
    cy.contains("No classes added yet", { timeout: 10000 }).should(
      "be.visible",
    );

    // ---- Switch back to the first variant ----
    cy.get("[data-test=timetable-variant-switcher]").click();
    // Select the first (non-current) item – it will be the one with the
    // remembered name from @variant1Name
    cy.get("[data-slot=select-item]").first().click();

    // ---- Verify the course is still there in the first variant ----
    cy.get("[data-test=timetable-grid]", { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get("[data-test=timetable-grid]").should("not.be.empty");
  });
});
