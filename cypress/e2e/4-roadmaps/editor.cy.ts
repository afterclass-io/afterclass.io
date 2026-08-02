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
  // Setup: login & navigate to /roadmaps/mine before every test
  // -------------------------------------------------------------------------
  beforeEach(function () {
    cy.login();
    cy.visit("/roadmaps/mine");
  });

  // -------------------------------------------------------------------------
  // 1. Page loads with empty state
  // -------------------------------------------------------------------------
  it("should display the empty state when no roadmaps exist", function () {
    // The page should show the "No roadmaps yet" message or the
    // "+" button to create one
    cy.contains("No roadmaps yet").should("be.visible");
    cy.get("[aria-label='Create new roadmap']").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 2. Create a new roadmap
  // -------------------------------------------------------------------------
  it("should create a new roadmap", function () {
    // Click the create button
    cy.get("[aria-label='Create new roadmap']").click();

    // Type a name and confirm
    cy.get("[data-test=roadmap-create-input]").type("Test Plan{enter}");

    // The new roadmap should appear in the list and be selected
    cy.contains("Test Plan", { timeout: 10000 }).should("be.visible");

    // The course search sidebar should be visible
    cy.contains("Courses").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 3. Search for a course
  // -------------------------------------------------------------------------
  it("should search for a course and display results", function () {
    // Create a roadmap first
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("Test Plan{enter}");
    cy.contains("Test Plan", { timeout: 10000 }).should("be.visible");

    // Search for a course
    cy.get("input[aria-label='Search courses to add to roadmap']").type(
      "COR-",
    );

    // Wait for results to appear
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 4. Click-to-add a course to the roadmap
  // -------------------------------------------------------------------------
  it("should add a course to the roadmap via click", function () {
    // Create a roadmap
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("Test Plan{enter}");
    cy.contains("Test Plan", { timeout: 10000 }).should("be.visible");

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

    // The grid should show the course (look for the course code in the grid)
    // The term cell should have at least one course chip
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );
    cy.get("[data-droppable-id='1-T1']").should("not.be.empty");
  });

  // -------------------------------------------------------------------------
  // 5. Reload → entries persist
  // -------------------------------------------------------------------------
  it("should persist roadmap entries after page reload", function () {
    // Create roadmap and add a course
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("Persist Test{enter}");
    cy.contains("Persist Test", { timeout: 10000 }).should("be.visible");

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

    // After reload, the roadmap list should reload and the roadmap
    // should still exist with its entry
    cy.contains("Persist Test", { timeout: 15000 }).should("be.visible");

    // Navigate to it by clicking
    cy.contains("Persist Test").click();

    // The grid should still show the course
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );
  });

  // -------------------------------------------------------------------------
  // 6. Rename the roadmap
  // -------------------------------------------------------------------------
  it("should rename a roadmap", function () {
    // Create a roadmap
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("Original Name{enter}");
    cy.contains("Original Name", { timeout: 10000 }).should("be.visible");

    // Hover over the item and click the rename button
    cy.contains("Original Name")
      .closest(".group")
      .find("[aria-label='Rename Original Name']")
      .click({ force: true });

    // Edit the name
    cy.get("[data-test=roadmap-rename-input]")
      .clear()
      .type("Renamed Plan{enter}");

    // The new name should appear
    cy.contains("Renamed Plan", { timeout: 10000 }).should("be.visible");
    cy.contains("Original Name").should("not.exist");
  });

  // -------------------------------------------------------------------------
  // 7. Delete the roadmap
  // -------------------------------------------------------------------------
  it("should delete a roadmap", function () {
    // Create a roadmap
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("To Delete{enter}");
    cy.contains("To Delete", { timeout: 10000 }).should("be.visible");

    // Hover and click delete
    cy.contains("To Delete")
      .closest(".group")
      .find("[aria-label='Delete To Delete']")
      .click({ force: true });

    // Confirm deletion in the alert dialog
    cy.contains("Delete roadmap?").should("be.visible");
    cy.get("[data-test=roadmap-delete-confirm]").click();

    // The roadmap should be gone
    cy.contains("To Delete", { timeout: 10000 }).should("not.exist");
    cy.contains("No roadmaps yet").should("be.visible");
  });

  // -------------------------------------------------------------------------
  // 8. Full lifecycle: create → add → rename → delete
  // -------------------------------------------------------------------------
  it("should complete the full roadmap lifecycle", function () {
    // Create
    cy.get("[aria-label='Create new roadmap']").click();
    cy.get("[data-test=roadmap-create-input]").type("Lifecycle Test{enter}");
    cy.contains("Lifecycle Test", { timeout: 10000 }).should("be.visible");

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
    cy.contains("Lifecycle Test")
      .closest(".group")
      .find("[aria-label='Rename Lifecycle Test']")
      .click({ force: true });
    cy.get("[data-test=roadmap-rename-input]")
      .clear()
      .type("Lifecycle Done{enter}");
    cy.contains("Lifecycle Done", { timeout: 10000 }).should("be.visible");

    // Delete
    cy.contains("Lifecycle Done")
      .closest(".group")
      .find("[aria-label='Delete Lifecycle Done']")
      .click({ force: true });
    cy.contains("Delete roadmap?").should("be.visible");
    cy.get("[data-test=roadmap-delete-confirm]").click();

    // Verify gone
    cy.contains("Lifecycle Done", { timeout: 10000 }).should("not.exist");
  });
});
