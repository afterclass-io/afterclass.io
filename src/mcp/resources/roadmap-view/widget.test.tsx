// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import RoadmapView, { widgetMetadata } from "./widget";

function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "roadmap-view" }),
    )}`,
  );
}

function renderRoadmapView(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<RoadmapView />);
}

const publicProps = {
  roadmapId: "r1",
  name: "BSc IS (Community)",
  isPublic: true,
  owner: "senior123",
  voteCount: 42,
  entries: [
    { yearNumber: 1, term: "T1", courseCode: "CS101", courseName: "Intro to CS", creditUnits: 1 },
    { yearNumber: 1, term: "T2", courseCode: "CS102", courseName: "Data Structures", creditUnits: 1 },
    { yearNumber: 2, term: "T1", courseCode: "CS201", courseName: "Algorithms", creditUnits: 1 },
  ],
};

const privateProps = {
  ...publicProps,
  isPublic: false,
  owner: null,
  voteCount: null,
};

describe("roadmap-view widgetMetadata", () => {
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses publicProps", () => {
    expect(propsSchema.safeParse(publicProps).success).toBe(true);
  });

  it("parses the private variant (null owner/voteCount)", () => {
    expect(propsSchema.safeParse(privateProps).success).toBe(true);
  });
});

describe("roadmap-view widget render", () => {
  it("shows loading state while pending", () => {
    renderRoadmapView(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders year headings, term labels, and course codes", () => {
    renderRoadmapView(publicProps);
    expect(screen.getByText("Year 1")).toBeTruthy();
    expect(screen.getByText("Year 2")).toBeTruthy();
    expect(screen.getAllByText("T1").length).toBe(2);
    expect(screen.getByText("T2")).toBeTruthy();
    expect(screen.getByText("CS101")).toBeTruthy();
    expect(screen.getByText("CS102")).toBeTruthy();
    expect(screen.getByText("CS201")).toBeTruthy();
  });

  it("public: renders owner and vote count", () => {
    renderRoadmapView(publicProps);
    expect(screen.getByText(/senior123/)).toBeTruthy();
    expect(screen.getByText(/42 upvotes/)).toBeTruthy();
  });

  it("private: does not render owner or vote count", () => {
    renderRoadmapView(privateProps);
    expect(screen.queryByText(/senior123/)).toBeNull();
    expect(screen.queryByText(/upvotes/)).toBeNull();
  });

  it("shows empty state when there are no entries", () => {
    renderRoadmapView({ ...privateProps, entries: [] });
    expect(screen.getByText("No courses in this roadmap yet.")).toBeTruthy();
  });
});
