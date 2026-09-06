// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKENS } from "../tokens";
import { ReviewCard, type ReviewCardData } from "./ReviewCard";

const full: ReviewCardData = {
  id: "rv1",
  body: "Heavy group work but fair grading.",
  tips: "Start the project early.",
  rating: 4,
  labels: ["Group Work", "Fair"],
  voteCount: 12,
  createdAt: "2026-01-15T00:00:00.000Z",
  courseCode: "COR-MGMT1202",
  professorName: "Prof X",
};

describe("ReviewCard", () => {
  it("renders rating, body, tips, labels, votes, and the date line (no per-card context — that lives in the shell header)", () => {
    render(<ReviewCard review={full} c={TOKENS.light} dark={false} />);
    expect(screen.getByText("★ 4/5")).toBeInTheDocument();
    expect(screen.queryByText("COR-MGMT1202 · Prof X")).toBeNull();
    expect(
      screen.getByText("Heavy group work but fair grading."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tips: Start the project early\./),
    ).toBeInTheDocument();
    expect(screen.getByText("Group Work")).toBeInTheDocument();
    expect(screen.getByText("Fair")).toBeInTheDocument();
    expect(screen.getByText(/12 upvotes/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-15/)).toBeInTheDocument();
  });

  it("renders nothing for null body/tips/rating (no 'null' text)", () => {
    render(
      <ReviewCard
        review={{
          ...full,
          body: null,
          tips: null,
          rating: null,
          labels: [],
          courseCode: null,
          professorName: null,
        }}
        c={TOKENS.light}
        dark={false}
      />,
    );
    expect(screen.queryByText("null")).toBeNull();
    expect(screen.queryByText(/★/)).toBeNull();
    expect(screen.getByText(/12 upvotes/)).toBeInTheDocument();
  });

  it("renders no date line for the catalog empty-string createdAt (no crash, no 'Invalid Date')", () => {
    render(
      <ReviewCard
        review={{ ...full, createdAt: "" }}
        c={TOKENS.light}
        dark={false}
      />,
    );
    expect(
      screen.getByText("Heavy group work but fair grading."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).toBeNull();
    expect(screen.queryByText("null")).toBeNull();
  });

  it("ignores course/professor context fields (shell header owns context)", () => {
    render(
      <ReviewCard
        review={{
          ...full,
          body: "Clear lectures.",
          courseCode: null,
          professorName: "FANG Bingxu",
        }}
        c={TOKENS.dark}
        dark={true}
      />,
    );
    expect(screen.queryByText("FANG Bingxu")).toBeNull();
    expect(screen.getByText("Clear lectures.")).toBeInTheDocument();
    expect(screen.queryByText("null")).toBeNull();
  });
});
