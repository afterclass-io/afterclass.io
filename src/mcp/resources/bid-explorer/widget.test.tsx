// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import BidExplorer, { widgetMetadata } from "./widget";

/** Feed props to the REAL useWidget hook via mcp-use's URL-params fallback
 *  (active because jsdom is not an iframe -> provider = "mcp-ui"). */
function setMcpParams(toolOutput: unknown, toolInput: unknown = {}) {
  window.history.replaceState(
    null,
    "",
    `/?mcpUseParams=${encodeURIComponent(
      JSON.stringify({ toolInput, toolOutput, toolId: "bid-explorer" }),
    )}`,
  );
}

function renderBidExplorer(toolOutput: unknown) {
  setMcpParams(toolOutput);
  return render(<BidExplorer />);
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

const history = [
  { acadTermId: "AY2024/25-T1", round: "1", window: 1, min: 10, median: 22, vacancy: 45 },
  { acadTermId: "AY2025/26-T1", round: "1", window: 1, min: 14, median: 28, vacancy: 40 },
];

const fullProps = {
  classId: "cl1",
  history,
  prediction: {
    medianPredicted: 30,
    minPredicted: 18,
    bidWindow: { id: 53, round: "1", window: 1 },
  },
  safetyFactors: [
    { beatsPercentage: 50, multiplier: 1.0 },
    { beatsPercentage: 70, multiplier: 1.05 },
    { beatsPercentage: 90, multiplier: 1.15 },
  ],
};

const historyOnlyProps = {
  classId: null,
  history,
  prediction: null,
  safetyFactors: [],
};

describe("bid-explorer widgetMetadata", () => {
  // `WidgetMetadata.props` is typed `z.ZodTypeAny | InputDefinition[] | undefined`;
  // narrow to the Zod schema the widget actually registers.
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses the full shape the tool's toWidgetProps produces", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("parses the history-only variant (null classId/prediction, no factors)", () => {
    expect(propsSchema.safeParse(historyOnlyProps).success).toBe(true);
  });
});

describe("bid-explorer widget render", () => {
  it("shows the loading state while pending", () => {
    renderBidExplorer(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("renders each history term label and its min/median values", () => {
    renderBidExplorer(fullProps);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeTruthy();
    expect(screen.getByText("AY2025/26-T1 R1")).toBeTruthy();
    expect(screen.getByText("$10–$22")).toBeTruthy();
    expect(screen.getByText("$14–$28")).toBeTruthy();
  });

  it("renders the prediction marker and defaults the slider to the 70% factor", () => {
    renderBidExplorer(fullProps);
    expect(screen.getByText("Predicted")).toBeTruthy();
    expect(screen.getByText("Round 1 W1")).toBeTruthy();
    expect(screen.getByText(/median \$30/)).toBeTruthy(); // predicted median
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("1"); // index of the 70% factor
    expect(screen.getByText(/beats 70% of bids × 1\.05/)).toBeTruthy();
    // suggested = round(30 x 1.05 x 100) / 100 = 31.5
    expect(screen.getByText("$31.5")).toBeTruthy();
  });

  it("updates the suggested amount and label when the slider moves", () => {
    renderBidExplorer(fullProps);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(screen.getByText(/beats 90% of bids × 1\.15/)).toBeTruthy();
    // suggested = round(30 x 1.15 x 100) / 100 = 34.5
    expect(screen.getByText("$34.5")).toBeTruthy();
  });

  it("renders history without slider or CTA when there is no prediction", () => {
    renderBidExplorer(historyOnlyProps);
    expect(screen.getByText("AY2024/25-T1 R1")).toBeTruthy();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA button carries the current suggested amount only when classId + prediction exist", () => {
    renderBidExplorer(fullProps);
    expect(
      screen.getByRole("button", { name: "Set bid to $31.5" }),
    ).toBeTruthy();
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "2" } });
    expect(
      screen.getByRole("button", { name: "Set bid to $34.5" }),
    ).toBeTruthy();
  });

  it("CTA calls upsert-bid with classId, bidAmount AND bidWindowId", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderBidExplorer(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "upsert-bid",
        arguments: { classId: "cl1", bidAmount: 31.5, bidWindowId: 53 },
      });
    } finally {
      stop();
    }
  });

  it("slider lands on the 70% factor when props arrive AFTER mount (no remount)", () => {
    // Real mcp-apps hosts deliver props asynchronously after ui/initialize
    // without remounting. The URL-params fallback re-reads
    // window.location.search on each render, so replaceState + rerender
    // simulates that arrival on the SAME mounted component.
    const { rerender } = renderBidExplorer(null);
    expect(screen.getByText("Loading...")).toBeTruthy();
    setMcpParams(fullProps);
    rerender(<BidExplorer />);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("1"); // index of the 70% factor
    expect(screen.getByText("$31.5")).toBeTruthy();
  });

  it("prediction without safety factors falls back to multiplier 1.0 (CTA still shows)", async () => {
    const noFactors = { ...fullProps, safetyFactors: [] };
    const { calls, stop } = captureToolCalls();
    try {
      renderBidExplorer(noFactors);
      // no slider without factors, but the CTA offers the bare median
      expect(screen.queryByRole("slider")).toBeNull();
      const cta = screen.getByRole("button", { name: "Set bid to $30" });
      fireEvent.click(cta);
      await waitFor(() => expect(calls).toHaveLength(1));
      expect(calls[0]).toEqual({
        name: "upsert-bid",
        arguments: { classId: "cl1", bidAmount: 30, bidWindowId: 53 },
      });
    } finally {
      stop();
    }
  });

  it("shows Saved feedback after successful upsert-bid", async () => {
    const { calls, stop } = captureToolCalls();
    try {
      renderBidExplorer(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
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
      renderBidExplorer(fullProps);
      fireEvent.click(screen.getByRole("button", { name: "Set bid to $31.5" }));
      await waitFor(() => expect(screen.getByRole("button", { name: /Failed to save/ })).toBeTruthy());
    } finally {
      window.removeEventListener("message", listener);
    }
  });
});
