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
    // Prevent the product tour from auto-starting and blocking the UI.
    cy.window().then((win) => {
      win.localStorage.setItem("hasSeenTimetableTour", JSON.stringify(true));
      win.localStorage.setItem("hasSeenRoadmapsTour", JSON.stringify(true));
    });
    cy.visit("/timetable");
  });

  // -------------------------------------------------------------------------
  // 1. Page loads with term picker visible and term is auto-selected
  // -------------------------------------------------------------------------
  it("should display the term picker on load with a term auto-selected", function () {
    // The TermPicker auto-selects a term (current bid window or calendar term).
    // Wait for the selected value to appear (not the placeholder).
    cy.get("[data-test=timetable-term-picker]", { timeout: 10000 }).should("be.visible");
    // After auto-selection, the picker shows the term label, not the placeholder.
    // Verify the picker has a non-empty value (the term has been selected).
    cy.get("[data-test=timetable-term-picker]").should("not.have.text", "");
  });

  // -------------------------------------------------------------------------
  // 2. Select a term → variant is created & search panel appears
  // -------------------------------------------------------------------------
  it("should select a term and auto-create a default timetable variant", function () {
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    // After auto-creation, the variant switcher should be visible
    // and a default timetable name (e.g. "My Timetable") should appear
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should("be.visible");

    // The search panel should now be enabled (no longer showing "Pick a term to start searching")
    cy.get("[data-test=timetable-search-input]").should("not.be.disabled");
  });

  // -------------------------------------------------------------------------
  // 3. Search for a course → see results → expand sections
  // -------------------------------------------------------------------------
  it("should search for a course and display results", function () {
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    // Wait for the search input to be enabled
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 }).should("not.be.disabled");

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
    // Use AY202425T2 (seeded classes) for determinism — first() depends on term sort order
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

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

    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.intercept("POST", "**/api/trpc/*timetable.addSlot*").as("addSlotT4");
    cy.intercept("POST", "**/api/trpc/*timetable.setSlotSection*").as("setSlotT4");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    // Accept either addSlot (new course) or setSlotSection (already present) or time-conflict toast
    cy.wait(1500);
    cy.get("body").then(($body) => {
      const hasTimeConflict = $body.text().includes("Time conflict");
      if (hasTimeConflict) {
        // Retry with second section
        cy.get("[data-test^=timetable-section-action-]").eq(1).click({ force: true });
        cy.wait(2000);
      }
    });
    cy.get("[data-test=timetable-slot-card]", { timeout: 15000 }).should("exist");
  });

  // -------------------------------------------------------------------------
  // 5. Reload → course persists
  // -------------------------------------------------------------------------
  it("should persist the added course after page reload", function () {
    // Use AY202425T2 for determinism
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("COR-");

    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.intercept("POST", "**/api/trpc/*timetable.addSlot*").as("addSlotT5");
    cy.intercept("POST", "**/api/trpc/*timetable.setSlotSection*").as("setSlotT5");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    cy.wait(1500);
    cy.get("body").then(($body) => {
      const hasTimeConflict = $body.text().includes("Time conflict");
      if (hasTimeConflict) {
        cy.get("[data-test^=timetable-section-action-]").eq(1).click({ force: true });
        cy.wait(2000);
      }
    });
    cy.get("[data-test=timetable-slot-card]", { timeout: 15000 }).should("exist");

    // ---- Reload ----
    cy.reload();

    // After reload, wait for the term picker to restore (auto-selects a term)
    cy.get("[data-test=timetable-term-picker]", { timeout: 15000 }).should("be.visible");
    cy.get("[data-test=timetable-term-picker]").should("not.have.text", "");

    // The grid should appear with the previously added course
    cy.get("[data-test=timetable-slot-card]", { timeout: 15000 }).should("exist");
  });

  // -------------------------------------------------------------------------
  // 6. Create a second variant, switch to it → empty, switch back → course present
  // -------------------------------------------------------------------------
  it("should keep variants independent: second variant empty, first retains courses", function () {
    // ---- Select term AY202425T2 for determinism ----
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    // Wait for variant switcher to appear
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should("be.visible");

    // ---- Add a course to the first (default) variant ----
    // Use IS215 which is not used by other specs' COR-/ACCT searches
    cy.intercept("POST", "**/api/trpc/*timetable.addSlot*").as("addSlotT6");
    cy.intercept("POST", "**/api/trpc/*timetable.setSlotSection*").as("setSlotT6");
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .clear()
      .type("IS215");

    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    cy.contains("Sections", { timeout: 10000 }).should("be.visible");
    cy.get("[data-test^=timetable-section-action-]").first().click();
    cy.wait(1500);
    cy.get("body").then(($body) => {
      const hasTimeConflict = $body.text().includes("Time conflict");
      if (hasTimeConflict) {
        cy.get("[data-test^=timetable-section-action-]").eq(1).click({ force: true });
        cy.wait(1500);
      }
    });

    // Wait for slot card to appear
    cy.get("[data-test=timetable-slot-card]", { timeout: 15000 }).should("exist");

    // Remember the current variant name / slot count for later assertion
    cy.get("[data-test=timetable-variant-switcher]").invoke("text").as("variant1Name");

    // ---- Create a second variant ----
    cy.intercept("POST", "**/api/trpc/*timetable.create*").as("createVariant");
    cy.get("[data-test=timetable-variant-create]").click();
    cy.wait("@createVariant", { timeout: 15000 });

    // Wait for the new variant to be created (the switcher value should change)
    cy.get("[data-test=timetable-variant-switcher]", { timeout: 10000 }).should("be.visible");

    // ---- Verify the second variant is empty ----
    // The grid should show the empty state ("No classes added yet")
    cy.contains("No classes added yet", { timeout: 10000 }).should("be.visible");

    // ---- Switch back to the first variant ----
    cy.get("[data-test=timetable-variant-switcher]").click();
    // Select the first (non-current) item – it will be the one with the
    // remembered name from @variant1Name
    cy.get("[data-slot=select-item]").first().click();

    // ---- Verify the course is still there in the first variant ----
    cy.get("[data-test=timetable-grid]", { timeout: 10000 }).should("be.visible");
    cy.get("[data-test=timetable-slot-card]", { timeout: 10000 }).should("exist");
  });

  // -------------------------------------------------------------------------
  // 8. Securing a bid syncs the class onto the active timetable (grid)
  //    without a reload; budgets can't go below what's spent.
  // -------------------------------------------------------------------------

  /** Add a fresh ACCT102 G2 bid (e$ 50) via the bids-table "Add bid" dialog. */
  function addAcctG2Bid() {
    cy.intercept("POST", "**/api/trpc/*userBids.upsert*").as("upsertBid");
    cy.contains("button", "Add bid").click();
    cy.get("[data-test=bid-dialog]", { timeout: 10000 }).should("be.visible");

    // Course search (term-scoped) → pick ACCT102.
    cy.get('[aria-label="Search courses"]').type("ACCT");
    cy.contains("[data-test=bid-dialog] button", "ACCT102", { timeout: 15000 }).first().click();

    // Section G2 (Monday timing in the seed, so its card renders on the grid).
    cy.get('[aria-label="Select section"]').click();
    cy.get("[data-slot=select-item]").contains("G2").click();

    // Amount; round/window are auto-preselected in add mode.
    cy.get("#bid-amount").type("50");
    cy.contains("button", "Save bid").click();
    cy.wait("@upsertBid", { timeout: 15000 });
    // Wait for the dialog to fully unmount (incl. its exit animation) so the
    // modal overlay can't cover later interactions.
    cy.get("[data-test=bid-dialog]", { timeout: 15000 }).should("not.exist");
  }

  /**
   * Ensure the ACCT102 G2 bid is SECURED, re-running the server-side sync
   * even across repeated runs: if a previous run already left it secured
   * (repeated runs upsert the same bid window and keep the status), revert
   * it to Planned first so re-securing re-syncs the active timetable.
   * Returns once the body is no longer scroll-locked (modal menu closed).
   */
  function ensureAcctG2BidSecured() {
    addAcctG2Bid();
    cy.intercept("POST", "**/api/trpc/*userBids.setStatus*").as("setStatusBid");
    cy.get('[aria-label^="Change status for ACCT102 G2 bid"]', {
      timeout: 15000,
    })
      .invoke("text")
      .then((text) => {
        if (text.includes("Secured")) {
          cy.get('[aria-label^="Change status for ACCT102 G2 bid"]').click();
          cy.get('[role="menuitem"]').contains("Planned").click({ force: true });
          cy.wait("@setStatusBid", { timeout: 15000 });
        }
        cy.get('[aria-label^="Change status for ACCT102 G2 bid"]').click();
        cy.get('[role="menuitem"]').contains("Secured").click({ force: true });
        cy.wait("@setStatusBid", { timeout: 15000 });
      });
    // The modal status menu releases the body scroll-lock with its exit
    // animation — wait for it so later interactions aren't blocked.
    cy.get("body", { timeout: 15000 }).should("not.have.attr", "data-scroll-locked");
  }

  it("should sync a secured bid's class onto the grid with secured styling, without a reload", function () {
    // Term with seeded classes + bid windows.
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    ensureAcctG2BidSecured();

    // WITHOUT a reload, the synced class renders on the grid with the
    // secured styling hook (polls until the mutation + refetch land).
    cy.get("[data-test=timetable-slot-card-secured]", {
      timeout: 20000,
    }).should("exist");
  });

  it("should reject a budget below what's already spent with an error toast", function () {
    // Term with seeded classes + bid windows.
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    // Ensure the bid is SECURED so there is e$ already spent. A previous run
    // may already have secured it (same bid window, status preserved) — in
    // that case spent is already e$50.00 and no dropdown interaction is
    // needed.
    addAcctG2Bid();
    cy.intercept("POST", "**/api/trpc/*userBids.setStatus*").as("setStatusBid");
    cy.get('[aria-label^="Change status for ACCT102 G2 bid"]', {
      timeout: 15000,
    })
      .invoke("text")
      .then((text) => {
        if (!text.includes("Secured")) {
          cy.get('[aria-label^="Change status for ACCT102 G2 bid"]').click();
          cy.get('[role="menuitem"]').contains("Secured").click({
            force: true,
          });
          cy.wait("@setStatusBid", { timeout: 15000 });
        }
      });
    cy.get("body", { timeout: 15000 }).should("not.have.attr", "data-scroll-locked");

    // Wait for the dashboard's Spent figure to reflect e$50.00.
    cy.get("[data-test=bids-dashboard]", { timeout: 20000 }).contains("e$50.00");

    // Open the budget editor (pencil when a budget exists, inline input
    // otherwise).
    cy.get("body").then(($body) => {
      if ($body.find('[aria-label="Edit budget"]').length > 0) {
        cy.get('[aria-label="Edit budget"]').click();
      }
    });

    // Try to drop the budget below spent → BAD_REQUEST → error toast.
    cy.intercept("POST", "**/api/trpc/*userBids.upsertBudget*").as("upsertBudgetBelow");
    cy.get('[aria-label="e$ budget"]', { timeout: 15000 })
      .should("be.visible")
      .should("not.be.disabled")
      .clear()
      .type("10")
      .should("have.value", "10");
    cy.get("[data-test=bids-dashboard]").contains("button", "Save").click({ force: true });
    cy.wait("@upsertBudgetBelow", { timeout: 15000 });
    cy.get("[data-sonner-toast]", { timeout: 15000 }).should(
      "contain.text",
      "Budget cannot be lower",
    );
  });

  // -------------------------------------------------------------------------
  // 7. Add a section, then remove it via the × affordance — the grid must
  // update WITHOUT a reload. Regression pin for the stale tRPC GET cache:
  // if a mutated-then-refetched getArrangement came back from the browser
  // HTTP cache, the pre-mutation arrangement (slot present) would reappear
  // after the invalidate refetch and this assertion would fail.
  // -------------------------------------------------------------------------
  it("should remove a class via the × button and update the grid without a reload", function () {
    // Select the term that carries the seeded classes (AY202425T2) rather
    // than the picker's default — this spec must be deterministic even when
    // the default/current term has no classes to search.
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    // Use ACCT102 (not COR-*, which the other specs add) so this spec is
    // order-independent: it always adds a fresh section rather than
    // encountering the course already in the timetable (Swap button).
    cy.get("[data-test=timetable-search-input]", { timeout: 10000 })
      .should("not.be.disabled")
      .type("ACCT");

    cy.contains("Results", { timeout: 15000 }).should("be.visible");

    cy.get("button")
      .filter((_index, el) => Cypress.$(el).text().includes("CU"))
      .first()
      .click();

    cy.contains("Sections", { timeout: 10000 }).should("be.visible");

    // ---- Mutation 1: add a section (or swap if ACCT already present from prior spec) ----
    cy.intercept("POST", "**/api/trpc/*timetable.addSlot*").as("addSlotRemove");
    cy.intercept("POST", "**/api/trpc/*timetable.setSlotSection*").as("setSlotRemove");
    // ACCT102 G1 has no class timings so card never renders — pick G2
    cy.get("[data-test^=timetable-section-action-]").eq(1).click();
    cy.wait(1500);
    cy.get("body").then(($body) => {
      const hasTimeConflict = $body.text().includes("Time conflict");
      if (hasTimeConflict) {
        // Time conflict with COR-* slot; try the other ACCT section
        cy.get("[data-test^=timetable-section-action-]").first().click({ force: true });
        cy.wait(1500);
      }
    });

    // The slot card appears on the grid — count how many (may include COR- from prior specs)
    cy.get("[data-test=timetable-slot-card]", { timeout: 15000 }).should("exist");
    cy.get("[data-test=timetable-slot-card]").then(($before) => {
      const countBefore = $before.length;
      // ---- Mutation 2: remove the ACCT slot via the × affordance ----
      cy.intercept("POST", "**/api/trpc/*timetable.removeSlot*").as("removeSlot");
      cy.intercept("GET", "**/api/trpc/*timetable.getArrangement*").as("getArrangementAfterRemove");
      // Find the ACCT card's remove button specifically (last added)
      cy.get("[data-test^=timetable-slot-remove-]", { timeout: 15000 })
        .last()
        .click({ force: true });
      cy.wait("@removeSlot", { timeout: 15000 });
      cy.wait("@getArrangementAfterRemove", { timeout: 15000 });
      // WITHOUT a reload: count must have decreased by 1 (the ACCT card removed)
      cy.get("[data-test=timetable-slot-card]").should("have.length", countBefore - 1);
    });
  });

  // -------------------------------------------------------------------------
  // 9. Unified bid dialog: picking a course+section reveals class info and
  //    the prediction, both react to a section change, and saving adds the
  //    row to the bids table. Saves G1 (not G2) so it never collides with the
  //    ACCT102 G2 row that the secured-bid specs manage via the status menu.
  // -------------------------------------------------------------------------
  it("should show class info and prediction in the unified bid dialog and save a bid", function () {
    // Term with seeded classes + bid windows.
    cy.get("[data-test=timetable-term-picker]").click();
    cy.get("[data-test=timetable-term-AY202425T2]").click();

    cy.intercept("POST", "**/api/trpc/*userBids.upsert*").as("upsertBidUnified");

    // Open "+ Add bid".
    cy.contains("button", "Add bid").click();
    cy.get("[data-test=bid-dialog]", { timeout: 10000 }).should("be.visible");

    // Add mode starts with the lower sections hidden.
    cy.get("[data-test=class-info-card]").should("not.exist");
    cy.get("[data-test=bid-prediction-panel]").should("not.exist");

    // Pick ACCT102 + G1.
    cy.get('[aria-label="Search courses"]').type("ACCT");
    cy.contains("[data-test=bid-dialog] button", "ACCT102", { timeout: 15000 }).first().click();
    cy.get('[aria-label="Select section"]').click();
    cy.get("[data-slot=select-item]").contains("G1").click();

    // Class Information + Bid Prediction appear once a section is chosen.
    cy.get("[data-test=class-info-card]", { timeout: 15000 }).should("be.visible");
    cy.get("[data-test=class-info-card]").should("contain.text", "G1");
    cy.get("[data-test=bid-prediction-panel]", { timeout: 15000 }).should("be.visible");

    // They react to a section change (switch to G2, then back to G1).
    cy.get('[aria-label="Select section"]').click();
    cy.get("[data-slot=select-item]").contains("G2").click();
    cy.get("[data-test=class-info-card]", { timeout: 15000 }).should("contain.text", "G2");
    cy.get("[data-test=bid-prediction-panel]", { timeout: 15000 }).should("be.visible");
    cy.get('[aria-label="Select section"]').click();
    cy.get("[data-slot=select-item]").contains("G1").click();
    cy.get("[data-test=class-info-card]", { timeout: 15000 }).should("contain.text", "G1");

    // Save, then assert the row appears in the table.
    cy.get("#bid-amount").type("50");
    cy.contains("button", "Save bid").click();
    cy.wait("@upsertBidUnified", { timeout: 15000 });
    cy.get("[data-test=bid-dialog]", { timeout: 15000 }).should("not.exist");

    cy.contains("[data-test=bids-view]", "ACCT102", {
      timeout: 15000,
    }).should("be.visible");
    cy.contains("[data-test=bids-view]", "G1").should("be.visible");
  });
});
