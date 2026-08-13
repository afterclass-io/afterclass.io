/// <reference types="cypress" />

/**
 * Sharing E2E tests
 *
 * Covers the full sharing lifecycle for timetables and roadmaps:
 *   1. Login → go to /timetable
 *   2. Set timetable visibility to UNLISTED via real UI
 *   3. Logout → visit share link → verify read-only
 *   4. Set timetable back to PRIVATE → verify old URL 404s
 *   5. Publish a roadmap (Share dialog → Public)
 *   6. Verify roadmap appears in public gallery
 *   7. Visit /roadmaps/[id] — verify Grid + Timeline views
 *   8. Verify self-copy is blocked for own roadmaps
 *   9. Visit shared roadmap via UNLISTED token (read-only)
 *  10. Cleanup: unpublish and delete test roadmaps
 *
 * All flows are real — no manual-step stubs. Reflects CURRENT behavior:
 * UNLISTED link-sharing for timetables, no PUBLIC for timetables,
 * self-copy blocked, tokens regenerated.
 */

context("Sharing: Share Flow", function () {
  // -------------------------------------------------------------------------
  // Setup: login before every test
  // -------------------------------------------------------------------------
  beforeEach(function () {
    cy.login();
    // Prevent the product tour from auto-starting and blocking the UI.
    cy.window().then((win) => {
      win.localStorage.setItem("hasSeenTimetableTour", JSON.stringify(true));
      win.localStorage.setItem("hasSeenRoadmapsTour", JSON.stringify(true));
    });
  });

  /**
   * Helper: publish a test roadmap to the public gallery and store its name
   * and public-gallery ID as Cypress aliases (@publishedName, @publishedId).
   * Each test that needs a published roadmap calls this independently so a
   * failure in one test does not cascade to the others.
   *
   * Uses cy.intercept() to wait for each tRPC mutation before asserting UI
   * state (avoiding httpBatchStreamLink streaming-latency races).
   */
  function publishTestRoadmap(): void {
    const name = `Share Test ${Date.now()}`;

    cy.visit("/roadmaps?view=mine");
    cy.url({ timeout: 10000 }).should("include", "view=mine");

    // Create the roadmap
    cy.intercept("POST", "/api/trpc/roadmaps.create*").as("pubCreateRoadmap");
    cy.get("[aria-label='Create new roadmap']").click({ force: true });
    cy.get("[data-test=roadmap-create-input]").type(`${name}{enter}`);
    cy.get("[data-test=roadmap-create-input]").should("not.exist");
    cy.wait("@pubCreateRoadmap", { timeout: 15000 });
    cy.get("[data-test=roadmap-list]")
      .contains(name, { timeout: 10000 })
      .should("be.visible");

    // Add a course so the roadmap has content
    cy.get("[data-test=roadmap-list]").contains(name).click();
    cy.get("input[aria-label='Search courses to add to roadmap']").type("COR-");
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
    cy.get("[role='button']")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click({ force: true });
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );

    // Open the Share dialog, set PUBLIC, save
    cy.get("[data-test=share-button]", { timeout: 10000 }).click();
    cy.contains(`Share ${name}`).should("be.visible");
    cy.get("#share-visibility-PUBLIC").click({ force: true });
    cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("pubSetVisibility");
    cy.get("[data-test=share-save]").click();
    cy.wait("@pubSetVisibility", { timeout: 15000 });
    cy.contains("Sharing settings updated", { timeout: 10000 }).should(
      "be.visible",
    );

    // Go to the public gallery to capture the public page ID
    cy.visit("/roadmaps");
    cy.contains(name, { timeout: 10000 }).should("be.visible");

    cy.contains(name)
      .closest("a")
      .invoke("attr", "href")
      .then((href) => {
        const id = href?.split("/").pop();
        expect(id, "roadmap id in gallery card href").to.be.a("string").and.not
          .be.empty;
        cy.wrap(name).as("publishedName");
        cy.wrap(id!).as("publishedId");
      });
  }

  // -------------------------------------------------------------------------
  // 1. Set timetable visibility to UNLISTED & get share link (real UI flow)
  // -------------------------------------------------------------------------
  it("should set timetable visibility to UNLISTED and get a share link", function () {
    cy.visit("/timetable");

    // Select a term
    cy.get("[data-test=timetable-term-picker]", { timeout: 10000 }).click();
    cy.get("[data-slot=select-item]").first().click();
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Add a course so the shared view has content
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");
    cy.contains("Results", { timeout: 15000 }).should("be.visible");
    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();
    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.intercept("POST", "/api/trpc/timetable.addSlot*").as("addSlotT1");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    cy.wait("@addSlotT1", { timeout: 15000 });
    cy.contains("COR-", { timeout: 10000 }).should("be.visible");

    // Open the Share dialog via the real UI button
    cy.get("[data-test=share-button]").click();
    cy.contains("Share", { timeout: 5000 }).should("be.visible");

    // Set visibility to UNLISTED (timetables don't support PUBLIC)
    cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("setVisibilityT1");
    cy.get("#share-visibility-UNLISTED").click({ force: true });

    // Save
    cy.get("[data-test=share-save]").click();
    cy.wait("@setVisibilityT1", { timeout: 15000 });
    cy.contains("Sharing settings updated", { timeout: 10000 }).should(
      "be.visible",
    );

    // The share link input should now have a value containing the token path
    cy.get("[data-test=share-link-input]", { timeout: 5000 })
      .should("have.value")
      .and("contain", "/share/timetable/");
  });

  // -------------------------------------------------------------------------
  // 2. Visit shared timetable as logged-out user (real, independent setup)
  // -------------------------------------------------------------------------
  it("should render shared timetable as read-only for anonymous users", function () {
    // ---- Logged-in setup: create a share token ----
    cy.visit("/timetable");
    cy.get("[data-test=timetable-term-picker]", { timeout: 10000 }).click();
    cy.get("[data-slot=select-item]").first().click();
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Add a course
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");
    cy.contains("Results", { timeout: 15000 }).should("be.visible");
    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();
    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.intercept("POST", "/api/trpc/timetable.addSlot*").as("addSlotT2");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    cy.wait("@addSlotT2", { timeout: 15000 });
    cy.contains("COR-", { timeout: 10000 }).should("be.visible");

    // Open share dialog, set UNLISTED, save
    cy.get("[data-test=share-button]").click();
    cy.get("#share-visibility-UNLISTED").click({ force: true });
    cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("setVisibilityT2");
    cy.get("[data-test=share-save]").click();
    cy.wait("@setVisibilityT2", { timeout: 15000 });
    cy.contains("Sharing settings updated", { timeout: 10000 }).should(
      "be.visible",
    );

    // Capture the share token from the link input
    cy.get("[data-test=share-link-input]")
      .invoke("val")
      .then((url) => {
        const token = String(url).split("/share/timetable/")[1];
        expect(token, "share token from URL").to.be.a("string").and.not.be
          .empty;

        // ---- Logout ----
        cy.clearCookies();
        cy.clearLocalStorage();

        // ---- Visit shared timetable as anonymous ----
        cy.visit(`/share/timetable/${token}`);
        cy.contains("Shared Timetable", { timeout: 10000 }).should(
          "be.visible",
        );
        cy.contains("by ", { timeout: 5000 }).should("be.visible");

        // Verify read-only: no search input, no variant switcher
        cy.get("[data-test=timetable-search-input]").should("not.exist");
        cy.get("[data-test=timetable-variant-switcher]").should("not.exist");

        // Verify the grid is present (read-only mode)
        cy.get(".grid", { timeout: 5000 }).should("be.visible");
      });
  });

  // -------------------------------------------------------------------------
  // 3. Private timetable → share URL returns 404
  // -------------------------------------------------------------------------
  it("should return 404 when timetable visibility is set back to PRIVATE", function () {
    // ---- Setup: get a share token ----
    cy.visit("/timetable");
    cy.get("[data-test=timetable-term-picker]", { timeout: 10000 }).click();
    cy.get("[data-slot=select-item]").first().click();
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should(
      "be.visible",
    );

    // Add a course
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");
    cy.contains("Results", { timeout: 15000 }).should("be.visible");
    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();
    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.intercept("POST", "/api/trpc/timetable.addSlot*").as("addSlotT3");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    cy.wait("@addSlotT3", { timeout: 15000 });
    cy.contains("COR-", { timeout: 10000 }).should("be.visible");

    // Set UNLISTED to get a token
    cy.get("[data-test=share-button]").click();
    cy.get("#share-visibility-UNLISTED").click({ force: true });
    cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("setUnlistedT3");
    cy.get("[data-test=share-save]").click();
    cy.wait("@setUnlistedT3", { timeout: 15000 });
    cy.contains("Sharing settings updated", { timeout: 10000 }).should(
      "be.visible",
    );

    // Capture the token
    cy.get("[data-test=share-link-input]")
      .invoke("val")
      .then((url) => {
        const token = String(url).split("/share/timetable/")[1];

        // ---- Change back to PRIVATE ----
        cy.get("#share-visibility-PRIVATE").click({ force: true });
        cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("setPrivateT3");
        cy.get("[data-test=share-save]").click();
        cy.wait("@setPrivateT3", { timeout: 15000 });
        cy.contains("Sharing settings updated", { timeout: 10000 }).should(
          "be.visible",
        );

        // ---- Visit old share URL → should show not-found ----
        cy.clearCookies();
        cy.clearLocalStorage();
        cy.visit(`/share/timetable/${token}`, { failOnStatusCode: false });

        // The page should show an error state
        cy.contains(/not found|doesn.t exist|404/i, { timeout: 10000 }).should(
          "be.visible",
        );
      });
  });

  // -------------------------------------------------------------------------
  // 4. Publish a roadmap from /roadmaps/mine via the Share dialog
  // -------------------------------------------------------------------------
  it("should publish a roadmap to the public gallery", function () {
    publishTestRoadmap();
  });

  // -------------------------------------------------------------------------
  // 5. Verify roadmap appears in public gallery
  // -------------------------------------------------------------------------
  it("should show the published roadmap in the public gallery", function () {
    publishTestRoadmap();

    cy.get<string>("@publishedName").then((name) => {
      cy.visit("/roadmaps");

      // The published roadmap should appear in the gallery
      cy.contains(name, { timeout: 10000 }).should("be.visible");

      // Should show owner username and entry count
      cy.contains("by ").should("be.visible");
      cy.contains("course").should("be.visible");

      // Capture the public URL id from the gallery card link
      cy.contains(name)
        .closest("a")
        .invoke("attr", "href")
        .then((href) => {
          const id = href?.split("/").pop();
          expect(id, "roadmap id in gallery card href").to.be.a("string").and
            .not.be.empty;
          cy.wrap(id!).as("publishedId");
        });
    });
  });

  // -------------------------------------------------------------------------
  // 6. Visit public roadmap detail page (Grid + Timeline views)
  // -------------------------------------------------------------------------
  it("should render the public roadmap detail page with Grid and Timeline views", function () {
    publishTestRoadmap();

    cy.get<string>("@publishedId").then((id) => {
      cy.get<string>("@publishedName").then((name) => {
        cy.visit(`/roadmaps/${id}`);

        // Header should show roadmap name and owner
        cy.contains(name, { timeout: 10000 }).should("be.visible");
        cy.contains("by ").should("be.visible");

        // Should have "Copy this roadmap" button
        cy.contains("Copy this roadmap").should("be.visible");

        // Default view should be Grid
        cy.contains("Grid").should("be.visible");

        // Switch to Timeline view
        cy.get("[aria-label='Timeline View']").click();
        cy.get(".react-flow", { timeout: 5000 }).should("be.visible");
        cy.get(".react-flow__node", { timeout: 5000 }).should("exist");

        // Switch back to Grid view
        cy.get("[aria-label='Grid View']").click();
        cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
          "be.visible",
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // 7. Self-copy blocked: copying own public roadmap shows an error
  // -------------------------------------------------------------------------
  it("should block copying your own public roadmap", function () {
    publishTestRoadmap();

    cy.get<string>("@publishedId").then((id) => {
      cy.visit(`/roadmaps/${id}`);

      // The "Copy this roadmap" button is visible even for own roadmaps
      cy.contains("Copy this roadmap", { timeout: 10000 }).should("be.visible");

      // Click "Copy this roadmap" — self-copy should fail
      cy.contains("Copy this roadmap").click();

      // An error toast should appear (self-copy is blocked per P2T5/P2T8)
      cy.contains(/Failed to copy/i, { timeout: 10000 }).should("be.visible");

      // We should still be on the same page (no redirect)
      cy.url({ timeout: 5000 }).should("include", `/roadmaps/${id}`);
    });
  });

  // -------------------------------------------------------------------------
  // 8. Shared roadmap page renders correctly via UNLISTED token (real setup)
  // -------------------------------------------------------------------------
  it("should render shared roadmap page with read-only view", function () {
    const name = `Shared Token Test ${Date.now()}`;

    // ---- Create and share a roadmap with UNLISTED visibility ----
    cy.visit("/roadmaps?view=mine");
    cy.url({ timeout: 10000 }).should("include", "view=mine");

    cy.intercept("POST", "/api/trpc/roadmaps.create*").as("createRoadmapT8");
    cy.get("[aria-label='Create new roadmap']").click({ force: true });
    cy.get("[data-test=roadmap-create-input]").type(`${name}{enter}`);
    cy.get("[data-test=roadmap-create-input]").should("not.exist");
    cy.wait("@createRoadmapT8", { timeout: 15000 });
    cy.get("[data-test=roadmap-list]")
      .contains(name, { timeout: 10000 })
      .should("be.visible");

    // Add a course
    cy.get("[data-test=roadmap-list]").contains(name).click();
    cy.get("input[aria-label='Search courses to add to roadmap']").type("COR-");
    cy.contains("CU", { timeout: 15000 }).should("be.visible");
    cy.get("[role='button']")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click({ force: true });
    cy.get("[data-droppable-id='1-T1']", { timeout: 10000 }).should(
      "be.visible",
    );

    // Open share dialog, set UNLISTED, save
    cy.get("[data-test=share-button]", { timeout: 10000 }).click();
    cy.contains(`Share ${name}`).should("be.visible");
    cy.get("#share-visibility-UNLISTED").click({ force: true });
    cy.intercept("POST", "/api/trpc/sharing.setVisibility*").as("setVisibilityT8");
    cy.get("[data-test=share-save]").click();
    cy.wait("@setVisibilityT8", { timeout: 15000 });
    cy.contains("Sharing settings updated", { timeout: 10000 }).should(
      "be.visible",
    );

    // Capture the share token from the link input
    cy.get("[data-test=share-link-input]")
      .invoke("val")
      .then((url) => {
        const token = String(url).split("/share/roadmap/")[1];
        expect(token, "share token from URL").to.be.a("string").and.not.be
          .empty;

        // ---- Logout ----
        cy.clearCookies();
        cy.clearLocalStorage();

        // ---- Visit shared roadmap page ----
        cy.visit(`/share/roadmap/${token}`);

        // Verify shared roadmap renders
        cy.contains("Shared Roadmap", { timeout: 10000 }).should("be.visible");
        cy.contains("by ", { timeout: 5000 }).should("be.visible");

        // Grid/Timeline views work read-only
        cy.contains("Grid").should("be.visible");
        cy.get("[aria-label='Timeline View']").should("be.visible");
        cy.get("[aria-label='Timeline View']").click();
        cy.get(".react-flow", { timeout: 5000 }).should("be.visible");
      });
  });

  // -------------------------------------------------------------------------
  // 9. Cleanup: delete test roadmaps created by this spec
  // -------------------------------------------------------------------------
  it("should clean up test roadmaps", function () {
    cy.visit("/roadmaps?view=mine");
    cy.url({ timeout: 10000 }).should("include", "view=mine");

    // Delete roadmaps matching the test prefixes used in tests 4 and 8.
    // We iterate over the body text to find matching names because the exact
    // timestamps vary.
    cy.get("body").then(($body) => {
      const text = $body.text();
      const prefixes = ["Share Test ", "Shared Token Test "];
      for (const prefix of prefixes) {
        const re = new RegExp(`${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\d+`);
        const match = text.match(re);
        if (match) {
          const found = match[0];
          cy.contains(found)
            .closest(".group")
            .find("[aria-label^='Delete']")
            .click({ force: true });
          cy.contains("Delete roadmap?").should("be.visible");
          cy.get("[data-test=roadmap-delete-confirm]").click();
          cy.contains(found, { timeout: 10000 }).should("not.exist");
        }
      }
    });
  });
});
