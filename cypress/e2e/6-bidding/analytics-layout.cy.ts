/// <reference types="cypress" />

/**
 * Bid Analytics layout E2E test (afterclass-io#545)
 *
 * The bidding layout sits the main content column next to a CTA rail that is
 * sized to its own content (`max-w-min` + `text-nowrap`) and so never shrinks.
 * If the content column cannot shrink either, the row overflows and
 * `justify-center` spills half of that overflow to the LEFT — off-canvas, where
 * scrolling cannot reach it and the fixed sidebar covers it.
 *
 * Symptom: with the sidebar expanded, the course header card and Historical
 * Bidding Trend card are clipped on the left ("egotiating…", "storical…").
 *
 * Only viewports >= MOBILE_BREAKPOINT (1250, see src/common/hooks/use-mobile.ts)
 * can reproduce it — below that the sidebar is an overlay Sheet, not a fixed
 * column, so there is nothing for content to hide under.
 */

const ANALYTICS_URL =
  "/bidding/analytics?course=ACCT102&section=G1&classId=seed-ay202627t1-acct102-g1";

context("Bid Analytics: layout", function () {
  beforeEach(function () {
    cy.viewport(1280, 800);
    cy.visit(ANALYTICS_URL);
    // The Historical Bidding Trend card is what makes the content column wide
    // (718px min-content vs 299px for the class-info card), and its chart is
    // client-rendered — measure only once it has mounted, or the assertions
    // pass for the wrong reason.
    cy.get("[data-slot=chart]", { timeout: 20000 }).should("be.visible");
    cy.get("[data-slot=sidebar]").should("have.attr", "data-state", "expanded");
  });

  it("does not hide content behind the expanded sidebar", function () {
    cy.get("[data-slot=sidebar-container]").then(($sidebar) => {
      const sidebarRight = $sidebar[0]!.getBoundingClientRect().right;
      cy.get("[data-test=bid-analytics-content]").then(($content) => {
        const contentLeft = $content[0]!.getBoundingClientRect().left;
        expect(
          contentLeft,
          `content left edge (${contentLeft}) must clear the sidebar (${sidebarRight})`,
        ).to.be.at.least(sidebarRight);
      });
    });
  });

  // Guards `min-w-0` on SidebarInset: without it a wide page stretches the
  // whole shell past the viewport instead of fitting inside it.
  it("does not push the page wider than the viewport", function () {
    cy.document().then((doc) => {
      const { scrollWidth, clientWidth } = doc.documentElement;
      expect(
        scrollWidth,
        `page scroll width (${scrollWidth}) must not exceed the viewport (${clientWidth})`,
      ).to.be.at.most(clientWidth);
    });
  });
});
