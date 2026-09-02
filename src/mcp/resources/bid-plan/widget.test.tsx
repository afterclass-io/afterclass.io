// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import BidPlan, { widgetMetadata } from "./widget";

function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "bid-plan" }),
    )}`,
  );
}

function renderBidPlan(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<BidPlan />);
}

const fullProps = {
  acadTermId: "AY2026/27-T1",
  budget: { balance: 987.5 },
  bids: [
    {
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACC101",
      courseName: "Financial Accounting",
      section: "G1",
      professorName: "Prof X",
      round: "1",
      window: 1,
    },
    {
      id: "b2",
      bidAmount: 51,
      status: "SECURED",
      courseCode: "FIN201",
      courseName: "Finance",
      section: "G3",
      professorName: null,
      round: "1A",
      window: 2,
    },
  ],
};

describe("bid-plan widgetMetadata", () => {
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses fullProps", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("parses empty bids with null budget", () => {
    expect(
      propsSchema.safeParse({ acadTermId: "AY2026/27-T1", budget: null, bids: [] }).success,
    ).toBe(true);
  });
});

describe("bid-plan widget render", () => {
  it("shows loading state while pending", () => {
    renderBidPlan(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders budget balance and per-bid courseCode, amount, status chip", () => {
    renderBidPlan(fullProps);
    expect(screen.getByText(/987\.5/)).toBeTruthy();
    expect(screen.getByText("ACC101")).toBeTruthy();
    expect(screen.getByText("FIN201")).toBeTruthy();
    expect(screen.getByText("$25")).toBeTruthy();
    expect(screen.getByText("$51")).toBeTruthy();
    // status chips contain the raw status text
    expect(screen.getByText("PLANNED")).toBeTruthy();
    expect(screen.getByText("SECURED")).toBeTruthy();
  });

  it("shows empty state when no bids; no crash on budget: null", () => {
    renderBidPlan({ acadTermId: "AY2026/27-T1", budget: null, bids: [] });
    expect(screen.getByText("No bids planned for this term yet.")).toBeTruthy();
    expect(screen.getByText(/No budget set/)).toBeTruthy();
  });

  it("renders the post-mutation envelope's plan via toWidgetProps -> widget props passthrough", () => {
    // Write tools emit { updated, plan }; the widget receives unwrapped plan.
    // Simulate the register unwrap by feeding the plan directly (as widget would).
    const mutationPlan = {
      acadTermId: "AY2026/27-T1",
      budget: { balance: 150 },
      bids: [
        {
          id: "b3",
          bidAmount: 30,
          status: "PLANNED",
          courseCode: "COR-STAT1202",
          courseName: "Stats",
          section: "G2",
          professorName: "Prof Y",
          round: "1",
          window: 2,
        },
      ],
    };
    renderBidPlan(mutationPlan);
    expect(screen.getByText("COR-STAT1202")).toBeTruthy();
    expect(screen.getByText("$30")).toBeTruthy();
    expect(screen.getByText(/150/)).toBeTruthy();
  });
});
