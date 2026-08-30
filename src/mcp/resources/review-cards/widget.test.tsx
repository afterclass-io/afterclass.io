// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import ReviewCards, { widgetMetadata } from "./widget";

function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "review-cards" }),
    )}`,
  );
}

function renderReviewCards(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<ReviewCards />);
}

const fullProps = {
  context: "COR-MGMT1202",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: "Prof X",
    },
    {
      id: "rv2",
      body: null,
      tips: null,
      rating: 2,
      labels: [],
      voteCount: 0,
      createdAt: "2026-02-01T00:00:00.000Z",
      courseCode: "COR-MGMT1202",
      professorName: null,
    },
  ],
};

describe("review-cards widgetMetadata", () => {
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses fullProps", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("parses an empty review list", () => {
    expect(propsSchema.safeParse({ context: "x", reviews: [] }).success).toBe(
      true,
    );
  });
});

describe("review-cards widget render", () => {
  it("shows loading state while pending", () => {
    renderReviewCards(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders the context header, body, tips, rating, labels, and vote count", () => {
    renderReviewCards(fullProps);
    expect(screen.getByText("Reviews")).toBeTruthy();
    expect(screen.getByText("COR-MGMT1202")).toBeTruthy();
    expect(
      screen.getByText("Heavy group work but fair grading."),
    ).toBeTruthy();
    expect(screen.getByText(/Tips: Start the project early\./)).toBeTruthy();
    expect(screen.getByText("★ 4/5")).toBeTruthy();
    expect(screen.getByText("★ 2/5")).toBeTruthy();
    expect(screen.getByText("Group Work")).toBeTruthy();
    expect(screen.getByText("Fair")).toBeTruthy();
    expect(screen.getByText(/12 upvotes/)).toBeTruthy();
  });

  it("renders nothing for null body/tips rows (no 'null' text)", () => {
    renderReviewCards(fullProps);
    expect(screen.queryByText("null")).toBeNull();
    // Only the first review has body/tips.
    expect(screen.getAllByText(/^Tips:/).length).toBe(1);
  });

  it("shows empty state when there are no reviews", () => {
    renderReviewCards({ context: "CS101", reviews: [] });
    expect(screen.getByText("No reviews yet.")).toBeTruthy();
  });
});
