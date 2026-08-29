// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import CourseSearch, { widgetMetadata } from "./widget";

/** Feed props to the REAL useWidget hook via mcp-use's URL-params fallback
 *  (active because jsdom is not an iframe -> provider = "mcp-ui"). */
function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "course-search" }),
    )}`,
  );
}

function renderCourseSearch(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<CourseSearch />);
}

const sampleResult = {
  id: "c1",
  code: "ACC101",
  name: "Financial Accounting",
  creditUnits: 3,
  sections: [
    {
      classId: "cl1",
      section: "G1",
      professorName: "Prof Lim",
      timings: [
        {
          dayOfWeek: "MON",
          startTime: "10:00",
          endTime: "12:00",
          venue: "SR 3-1",
        },
      ],
    },
    { classId: "cl2", section: "G2", professorName: null, timings: [] },
  ],
};

describe("course-search widgetMetadata", () => {
  // `WidgetMetadata.props` is typed `z.ZodTypeAny | InputDefinition[] | undefined`;
  // narrow to the Zod schema the widget actually registers (`courseSearchPropsSchema`).
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses the shape the tool's toWidgetProps produces", () => {
    const parsed = propsSchema.safeParse({ results: [sampleResult] });
    expect(parsed.success).toBe(true);
  });

  it("rejects a non-results shape", () => {
    const parsed = propsSchema.safeParse({ results: "not-an-array" });
    expect(parsed.success).toBe(false);
  });
});

describe("course-search widget render", () => {
  it("shows the loading state while pending (no toolOutput yet)", () => {
    renderCourseSearch(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders the result count and each course", () => {
    renderCourseSearch({ results: [sampleResult] });
    expect(screen.getByText("1 course(s) found")).toBeTruthy();
    expect(screen.getByText(/ACC101/)).toBeTruthy();
    expect(screen.getByText(/Financial Accounting/)).toBeTruthy();
    expect(screen.getByText(/3 CU/)).toBeTruthy();
  });

  it("renders sections and professor names", () => {
    renderCourseSearch({ results: [sampleResult] });
    expect(screen.getAllByText(/G1/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Prof Lim/)).toBeTruthy();
    expect(screen.getAllByText(/G2/).length).toBeGreaterThan(0);
  });

  it("renders an empty state for zero results", () => {
    renderCourseSearch({ results: [] });
    expect(screen.getByText("No courses found")).toBeTruthy();
  });
});
