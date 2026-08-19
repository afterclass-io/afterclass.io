/// <reference types="cypress" />

/**
 * Roadmap editor E2E tests
 *
 * Covers the full roadmap lifecycle:
 *   1. Login
 *   2. Navigate to /roadmaps/mine
 *   3. Create a new roadmap
 *   4. Search for a course
 *   5. Click-to-add a course into the roadmap
 *   6. Verify the course appears in the grid
 *   7. Reload → persistence check
 *   8. Rename the roadmap
 *   9. Delete the roadmap
 *  10. Verify it's gone from the list
 */

context("Roadmaps: Editor", function () {
  // -------------------------------------------------------------------------
  // Setup: login & navigate to the My Roadmaps view before every test
  // -------------------------------------------------------------------------
  beforeEach(function () {
    cy.login();
    // Prevent the product tour from auto-starting and blocking the UI.
    cy.window().then((win) => {
      win.localStorage.setItem("hasSeenRoadmapsTour", JSON.stringify(true));
      win.localStorage.setItem("hasSeenTimetableTour", JSON.stringify(true));
    });
    cy.visit("/roadmaps?view=mine");
    // Wait for the page to settle — the roadmap list sidebar should be visible
    cy.get("[data-test=roadmap-list]", { timeout: 15000 }).should("be.visible");
  });

  /**
   * Helper: create a roadmap via the UI and wait for it to appear in the list.
   * Uses cy.intercept() to wait for the tRPC response before asserting UI state,
   * avoiding race conditions with httpBatchStreamLink response processing.
   */
  function createRoadmap(name: string): void {
    cy.intercept("POST", "**/api/trpc/*roadmaps.create*").as("createRoadmap");
    cy.get("[aria-label='Create new roadmap']", { timeout: 10000 })
      .should("be.visible")
      .click({ force: true });
    cy.get("[data-test=roadmap-create-input]", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(`${name}{enter}`);
    cy.wait("@createRoadmap", { timeout: 15000 });
    cy.get("[data-test=roadmap-create-input]").should("not.exist");
    cy.get("[data-test=roadmap-list]", { timeout: 10000 })
      .should("be.visible")
      .contains(name, { timeout: 10000 })
      .should("be.visible");
  }

  // -------------------------------------------------------------------------
  // 1. Page loads and shows the create button
  // -------------------------------------------------------------------------
  it("should display the create-new-roadmap button on load", function () {
    cy.get("[aria-label='Create new roadmap']").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 2. Create a new roadmap
  // -------------------------------------------------------------------------
  it("should create a new roadmap", function () {
    const name = `Test Plan ${Date.now()}`;
    createRoadmap(name);
    // Click the roadmap to open it — the editor should show course search
    cy.get("[data-test=roadmap-list]").contains(name).click();
    cy.contains("Courses").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 3. Search for a course
  // -------------------------------------------------------------------------
  it("should search for a course and display results", function () {
    const name = `Search Test ${Date.now()}`;
    createRoadmap(name);
    // Click the roadmap to open it
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // Search for a course
    cy.get("input[aria-label='Search courses to add to roadmap']").type(
      "COR-",
    );

    // Wait for results to appear (look for CU credit units indicator)
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 4. Click-to-add a course to the roadmap
  // -------------------------------------------------------------------------
  it("should add a course to the roadmap via click", function () {
    const name = `Add Test ${Date.now()}`;
    createRoadmap(name);
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // Search for a course
    cy.get("input[aria-label='Search courses to add to roadmap']").type(
      "COR-",
    );

    // Wait for results
    cy.contains("CU", { timeout: 15000 }).should("be.visible");

    // Click the first search result chip to add it
    cy.get("[role='button']")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click({ force: true });

    // The grid should show the course
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get("[data-droppable-id='1-T1']").should("not.be.empty");
  });

  // -------------------------------------------------------------------------
  // 5. Reload → entries persist
  // -------------------------------------------------------------------------
  it("should persist roadmap entries after page reload", function () {
    const name = `Persist Test ${Date.now()}`;
    createRoadmap(name);
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // Add a course
    cy.get("input[aria-label='Search courses to add to roadmap']").type(
      "COR-",
    );
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
    cy.get("[role='button']")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click({ force: true });

    // Verify course appears
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );

    // Reload
    cy.reload();

    // After reload, the roadmap should still exist
    cy.get("[data-test=roadmap-list]", { timeout: 15000 }).should("be.visible");
    cy.get("[data-test=roadmap-list]")
      .contains(name, { timeout: 10000 })
      .should("be.visible");

    // Navigate to it by clicking
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // The grid should still show the course
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );
  });

  // -------------------------------------------------------------------------
  // 6. Rename the roadmap
  // -------------------------------------------------------------------------
  it("should rename a roadmap", function () {
    const original = `Original ${Date.now()}`;
    const renamed = `Renamed ${Date.now()}`;
    createRoadmap(original);

    // Hover over the item and click the rename button
    cy.get("[data-test=roadmap-list]").contains(original)
      .closest(".group")
      .find(`[aria-label='Rename ${original}']`)
      .click({ force: true });

    // Edit the name
    cy.get("[data-test=roadmap-rename-input]")
      .clear()
      .type(`${renamed}{enter}`);

    // The new name should appear
    cy.get("[data-test=roadmap-list]")
      .contains(renamed, { timeout: 10000 })
      .should("be.visible");
    cy.get("[data-test=roadmap-list]").contains(original).should("not.exist");
  });

  // -------------------------------------------------------------------------
  // 6b. Matriculation year reflects immediately and can be re-edited
  // -------------------------------------------------------------------------
  it("should reflect the matriculation year selection immediately and allow changing it", function () {
    const name = `Matric ${Date.now()}`;
    cy.intercept("POST", "**/api/trpc/*roadmaps.create*").as("createMatric");
    cy.get("[aria-label='Create new roadmap']", { timeout: 10000 })
      .should("be.visible")
      .click({ force: true });
    cy.get("[data-test=roadmap-create-input]", { timeout: 10000 })
      .should("be.visible")
      .clear()
      .type(`${name}{enter}`);
    cy.wait("@createMatric", { timeout: 15000 });
    cy.get("[data-test=roadmap-create-input]").should("not.exist");
    cy.get("[data-test=roadmap-list]", { timeout: 10000 })
      .should("be.visible")
      .contains(name, { timeout: 10000 })
      .should("be.visible");
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // The matriculation-year control only appears once the roadmap is active
    cy.get("[data-test=roadmap-active-toggle]").click({ force: true });
    cy.get("[data-test=matric-term-select]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Wait on the mutation round-trip before asserting persisted state
    cy.intercept("POST", "**/api/trpc/*roadmaps.setMatricTerm*").as(
      "setMatricTerm",
    );

    // Only the AY options (exclude the "Clear" item)
    const ayOptions = () =>
      cy
        .get("[data-slot=select-content] [role=option]")
        .filter((_i, el) =>
          /^AY\d{4}\/\d{2,4}$/.test(Cypress.$(el).text().trim()),
        );

    // Pick the first AY; the trigger must show it immediately (optimistic
    // echo — previously it snapped back to the placeholder until refetch).
    cy.get("[data-test=matric-term-select]").click();
    ayOptions().should("have.length.at.least", 2);
    ayOptions()
      .first()
      .invoke("text")
      .then((firstAyText) => {
        const ay1 = firstAyText.trim();
        ayOptions().first().click();
        cy.get("[data-test=matric-term-select]").should("contain", ay1);
        cy.wait("@setMatricTerm");

        // Change to a different year and assert again
        cy.get("[data-test=matric-term-select]").click();
        ayOptions()
          .filter((_i, el) => Cypress.$(el).text().trim() !== ay1)
          .first()
          .invoke("text")
          .then((secondAyText) => {
            const ay2 = secondAyText.trim();
            cy.get("[data-slot=select-content] [role=option]")
              .contains(ay2)
              .click();
            cy.get("[data-test=matric-term-select]").should("contain", ay2);
            cy.wait("@setMatricTerm");
          });
      });
  });

  // -------------------------------------------------------------------------
  // 7. Delete the roadmap
  // -------------------------------------------------------------------------
  it("should delete a roadmap", function () {
    const name = `To Delete ${Date.now()}`;
    createRoadmap(name);

    // Hover and click delete
    cy.get("[data-test=roadmap-list]").contains(name)
      .closest(".group")
      .find(`[aria-label='Delete ${name}']`)
      .click({ force: true });

    // Confirm deletion in the alert dialog
    cy.contains("Delete roadmap?").should("be.visible");
    cy.get("[data-test=roadmap-delete-confirm]").click();

    // The roadmap should be gone
    cy.get("[data-test=roadmap-list]")
      .contains(name, { timeout: 10000 })
      .should("not.exist");
  });

  // -------------------------------------------------------------------------
  // 8. Full lifecycle: create → add → rename → delete
  // -------------------------------------------------------------------------
  it("should complete the full roadmap lifecycle", function () {
    const name = `Lifecycle ${Date.now()}`;
    const renamed = `Lifecycle Done ${Date.now()}`;
    createRoadmap(name);
    cy.get("[data-test=roadmap-list]").contains(name).click();

    // Add a course
    cy.get("input[aria-label='Search courses to add to roadmap']").type(
      "COR-",
    );
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
    cy.get("[role='button']")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click({ force: true });

    // Verify course in grid
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );

    // Rename
    cy.get("[data-test=roadmap-list]").contains(name)
      .closest(".group")
      .find(`[aria-label='Rename ${name}']`)
      .click({ force: true });
    cy.get("[data-test=roadmap-rename-input]")
      .clear()
      .type(`${renamed}{enter}`);
    cy.get("[data-test=roadmap-list]")
      .contains(renamed, { timeout: 10000 })
      .should("be.visible");

    // Delete
    cy.get("[data-test=roadmap-list]").contains(renamed)
      .closest(".group")
      .find(`[aria-label='Delete ${renamed}']`)
      .click({ force: true });
    cy.contains("Delete roadmap?").should("be.visible");
    cy.get("[data-test=roadmap-delete-confirm]").click();

    // Verify gone
    cy.get("[data-test=roadmap-list]")
      .contains(renamed, { timeout: 10000 })
      .should("not.exist");
  });
});
