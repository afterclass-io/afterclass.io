// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import BidRecommendation, { widgetMetadata } from "./widget";

/** Feed props to the REAL useWidget hook via mcp-use's URL-params fallback
 *  (active because jsdom is not an iframe -> provider = "mcp-ui"). */
function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "bid-recommendation" }),
    )}`,
  );
}

function renderBidRecommendation(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<BidRecommendation />);
}

/**
 * Capture `callTool` invocations: in the jsdom harness `window.parent ===
 * window`, and mcp-use's bridge delivers tool calls as JSON-RPC `tools/call`
 * requests via `window.parent.postMessage`. We record each request's params
 * and immediately post back a result so the bridge promise resolves (no
 * dangling request timeouts).
 */
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

const fullProps = {
  classId: "cl1",
  acadTermId: "t1",
  bidWindow: { id: 53, round: "1", window: 1 },
  predictedMedian: 25,
  suggestedBidAmount: 26.25,
  multiplierUsed: { beatsPercentage: 70, multiplier: 1.05 },
  rationale:
    "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
};

describe("bid-recommendation widgetMetadata", () => {
  // `WidgetMetadata.props` is typed `z.ZodTypeAny | InputDefinition[] | undefined`;
  // narrow to the Zod schema the widget actually registers (`bidRecommendationPropsSchema`).
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses the shape the tool's toWidgetProps produces", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("accepts a minimal shape (no multiplier/rationale/bidWindow)", () => {
    const minimal = {
      classId: "cl1",
      acadTermId: "t1",
      predictedMedian: 25,
      suggestedBidAmount: 25,
    };
    expect(propsSchema.safeParse(minimal).success).toBe(true);
  });
});

// TODO Task7: skipped — useWidget removed in mcp-use v2 (View migration in Task 7)
describe.skip("bid-recommendation widget render", () => {
  it("shows the loading state while pending", () => {
    renderBidRecommendation(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders the class id and suggested bid amount", () => {
    renderBidRecommendation(fullProps);
    expect(screen.getByText("cl1")).toBeTruthy();
    expect(screen.getByText("$26.25")).toBeTruthy();
  });

  it("renders the predicted median, multiplier and rationale when present", () => {
    renderBidRecommendation(fullProps);
    expect(screen.getByText("$25")).toBeTruthy();
    expect(screen.getAllByText(/1\.05/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/beats 70%/).length).toBeGreaterThan(0);
    expect(screen.getByText(/safety multiplier 1.05/)).toBeTruthy();
  });

  it("omits optional rows when absent", () => {
    renderBidRecommendation({
      classId: "cl2",
      acadTermId: "t1",
      suggestedBidAmount: 20,
    });
    expect(screen.queryByText(/Predicted median/)).toBeNull();
    expect(screen.queryByText(/Safety multiplier/)).toBeNull();
  });

  it("renders no CTA when bidWindow is absent (upsert-bid needs bidWindowId)", () => {
    renderBidRecommendation({
      classId: "cl2",
      acadTermId: "t1",
      suggestedBidAmount: 20,
    });
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA calls upsert-bid with classId, bidAmount AND bidWindowId", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderBidRecommendation(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "upsert-bid",
        arguments: { classId: "cl1", bidAmount: 26.25, bidWindowId: 53 },
      });
    } finally {
      stop();
    }
  });

  it("shows Saved feedback after successful upsert-bid", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderBidRecommendation(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      await waitFor(() => expect(screen.getByRole("button", { name: /Saved/ })).toBeTruthy());
    } finally {
      stop();
    }
  });

  it("shows Failed to save when callTool rejects", async () => {
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
      renderBidRecommendation(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $26.25" }));
      await waitFor(() => expect(screen.getByRole("button", { name: /Failed to save/ })).toBeTruthy());
    } finally {
      window.removeEventListener("message", listener);
    }
  });
});
