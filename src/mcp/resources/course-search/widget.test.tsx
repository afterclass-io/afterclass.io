// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("course-search widget render", () => {
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

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("course-search widget CTA", () => {
  function captureToolCalls() {
    const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const listener = (event: MessageEvent) => {
      const msg = event.data as {
        jsonrpc?: string;
        id?: number;
        method?: string;
        params?: { name: string; arguments: Record<string, unknown> };
      };
      if (msg?.jsonrpc === "2.0" && msg.method === "tools/call" && msg.params) {
        calls.push(msg.params);
        window.postMessage(
          { jsonrpc: "2.0", id: msg.id, result: { content: [] } },
          "*",
        );
      }
    };
    window.addEventListener("message", listener);
    return {
      calls,
      stop: () => window.removeEventListener("message", listener),
    };
  }

  it("Add G1 button calls add-class-to-timetable with classId cl1", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderCourseSearch({ results: [sampleResult] });
      fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "add-class-to-timetable",
        arguments: { classId: "cl1" },
      });
    } finally {
      stop();
    }
  });

  it("Add G2 button calls add-class-to-timetable with classId cl2", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderCourseSearch({ results: [sampleResult] });
      fireEvent.click(screen.getByRole("button", { name: "Add G2" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "add-class-to-timetable",
        arguments: { classId: "cl2" },
      });
    } finally {
      stop();
    }
  });

  it("does not render Add button when classId is missing", () => {
    const noIdResult = {
      ...sampleResult,
      sections: [{ section: "G3", professorName: "Prof Tan", timings: [] }],
    };
    renderCourseSearch({ results: [noIdResult] });
    expect(screen.queryByRole("button", { name: "Add G3" })).toBeNull();
  });

  it("shows Saved feedback after successful add-class-to-timetable", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderCourseSearch({ results: [sampleResult] });
      fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      await waitFor(() => expect(screen.getByRole("button", { name: /Saved/ })).toBeTruthy());
    } finally {
      stop();
    }
  });

  it("shows Failed feedback when callTool rejects", async () => {
    const listener = (event: MessageEvent) => {
      const msg = event.data as {
        jsonrpc?: string;
        id?: number;
        method?: string;
        params?: { name: string; arguments: Record<string, unknown> };
      };
      if (msg?.jsonrpc === "2.0" && msg.method === "tools/call" && msg.params) {
        window.postMessage(
          { jsonrpc: "2.0", id: msg.id, error: { code: -1, message: "rate limited" } },
          "*",
        );
      }
    };
    window.addEventListener("message", listener);
    try {
      renderCourseSearch({ results: [sampleResult] });
      fireEvent.click(screen.getByRole("button", { name: "Add G1" }));
      await waitFor(() => expect(screen.getByRole("button", { name: /Failed/ })).toBeTruthy());
    } finally {
      window.removeEventListener("message", listener);
    }
  });
});
