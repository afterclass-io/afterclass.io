// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("roadmap-view widget render", () => {
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

  it("renders post-mutation roadmap view (buildRoadmapView shape) with new entries", () => {
    // Write tools (create/copy/save) return roadmap-view via buildRoadmapView;
    // the widget receives normalized props { roadmapId, name, isPublic, entries }.
    const mutatedProps = {
      roadmapId: "r2",
      name: "Senior Plan (copy)",
      isPublic: false,
      owner: null,
      voteCount: null,
      entries: [
        { yearNumber: 1, term: "T1", courseCode: "COR-STAT1202", courseName: "Stats", creditUnits: 1 },
        { yearNumber: 1, term: "T2", courseCode: "CS102", courseName: "Data Structures", creditUnits: 1 },
      ],
    };
    renderRoadmapView(mutatedProps);
    expect(screen.getByText("Senior Plan (copy)")).toBeTruthy();
    expect(screen.getByText("COR-STAT1202")).toBeTruthy();
    expect(screen.getByText("CS102")).toBeTruthy();
  });
});

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("roadmap-view widget CTA", () => {
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

  it("Copy this roadmap button calls copy-public-roadmap with roadmapId", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderRoadmapView(publicProps);
      fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "copy-public-roadmap",
        arguments: { roadmapId: "r1" },
      });
    } finally {
      stop();
    }
  });

  it("does not render CTA for private roadmaps", () => {
    renderRoadmapView(privateProps);
    expect(screen.queryByRole("button", { name: /Copy this roadmap/i })).toBeNull();
  });

  it("shows Copied feedback after successful copy-public-roadmap", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderRoadmapView(publicProps);
      fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
      await waitFor(() => expect(calls).toHaveLength(1));
      await waitFor(() => expect(screen.getByRole("button", { name: /Copied/ })).toBeTruthy());
    } finally {
      stop();
    }
  });

  it("shows Copy failed when callTool rejects", async () => {
    const listener = (event: MessageEvent) => {
      const msg = event.data as {
        jsonrpc?: string;
        id?: number;
        method?: string;
        params?: { name: string; arguments: Record<string, unknown> };
      };
      if (msg?.jsonrpc === "2.0" && msg.method === "tools/call" && msg.params) {
        window.postMessage(
          { jsonrpc: "2.0", id: msg.id, error: { code: -1, message: "failed" } },
          "*",
        );
      }
    };
    window.addEventListener("message", listener);
    try {
      renderRoadmapView(publicProps);
      fireEvent.click(screen.getByRole("button", { name: /Copy this roadmap/i }));
      await waitFor(() => expect(screen.getByRole("button", { name: /Copy failed/ })).toBeTruthy());
    } finally {
      window.removeEventListener("message", listener);
    }
  });
});
