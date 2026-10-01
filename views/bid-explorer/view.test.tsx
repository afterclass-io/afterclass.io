// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the whole mcp-use/react surface the View consumes (v2 contract) —
// unlike the v1 widget tests, nothing seeds window.openai or mcpUseParams.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
  useHostContext: vi.fn(),
  useDynamicTool: vi.fn(),
}));

import BidExplorerView, { viewConfig, shortTermLabel } from "./view";
import {
  useDynamicTool,
  useHostContext,
  useToolContext,
  useViewTheme,
} from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);
const mockedUseHostContext = vi.mocked(useHostContext);
const mockedUseDynamicTool = vi.mocked(useDynamicTool);

const history = [
  {
    acadTermId: "AY2024/25-T1",
    round: "1",
    window: 1,
    min: 10,
    median: 22,
    vacancy: 45,
  },
  {
    acadTermId: "AY2025/26-T1",
    round: "1",
    window: 1,
    min: 14,
    median: 28,
    vacancy: 40,
  },
];

// Safety factors mirror the real seed data
// (`prisma/data/22_safety_factors.json`, EMPIRICAL/MEDIAN): ten
// rates 50/55/60/65/70/75/80/85/90/95 with ascending multipliers. The
// non-zero medianUncertainty is what makes the slider move the suggested
// amount, like the live view (suggested = predicted + multiplier x
// uncertainty, e$10 floor).
// MIN factors mirror the same beats ladder (MIN prediction type) so the
// Min formula row resolves its own multiplier per beatsPercentage.
const medianSafetyFactors = [
  { beatsPercentage: 50, multiplier: 0 },
  { beatsPercentage: 55, multiplier: 0.13 },
  { beatsPercentage: 60, multiplier: 0.25 },
  { beatsPercentage: 65, multiplier: 0.39 },
  { beatsPercentage: 70, multiplier: 0.54 },
  { beatsPercentage: 75, multiplier: 0.7 },
  { beatsPercentage: 80, multiplier: 0.88 },
  { beatsPercentage: 85, multiplier: 1.09 },
  { beatsPercentage: 90, multiplier: 1.37 },
  { beatsPercentage: 95, multiplier: 1.81 },
];
const minSafetyFactors = [
  { beatsPercentage: 50, multiplier: 0 },
  { beatsPercentage: 55, multiplier: 0.11 },
  { beatsPercentage: 60, multiplier: 0.22 },
  { beatsPercentage: 65, multiplier: 0.34 },
  { beatsPercentage: 70, multiplier: 0.47 },
  { beatsPercentage: 75, multiplier: 0.62 },
  { beatsPercentage: 80, multiplier: 0.79 },
  { beatsPercentage: 85, multiplier: 0.99 },
  { beatsPercentage: 90, multiplier: 1.24 },
  { beatsPercentage: 95, multiplier: 1.63 },
];
const fullProps = {
  classId: "cl1",
  courseCode: "COR-MGMT1202",
  section: "G1",
  history,
  currentAcadTermId: "AY2025/26-T1",
  prediction: {
    medianPredicted: 30,
    medianUncertainty: 4,
    minPredicted: 18,
    minUncertainty: 2,
    clfHasBidsProbability: 0.92,
    clfConfidenceScore: 0.81,
    bidWindow: {
      id: 53,
      acadTermId: "AY2025/26-T1",
      round: "1",
      window: 1,
    },
  },
  safetyFactors: medianSafetyFactors,
  minSafetyFactors,
};

const historyOnlyProps = {
  classId: null,
  history,
  prediction: null,
  safetyFactors: [],
};

function seedContext(
  handle: Partial<{
    status: "pending" | "ready" | "error";
    toolInput: unknown;
    toolOutput: unknown;
    error: { message: string };
  }>,
) {
  mockedUseToolContext.mockReturnValue(handle as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseViewTheme.mockReturnValue("light");
  mockedUseHostContext.mockReturnValue({
    isAvailable: true,
  } as never);
  mockedUseDynamicTool.mockReturnValue({
    callTool: vi.fn().mockResolvedValue({ structuredContent: {} }),
  } as never);
});

describe("BidExplorerView (v2)", () => {
  it("exports a viewConfig with autoResize and all display modes", () => {
    expect(viewConfig).toEqual({
      autoResize: true,
      displayModes: ["inline", "fullscreen", "pip"],
    });
  });

  it("shows the skeleton while pending (no toolOutput yet)", () => {
    seedContext({ status: "pending", toolInput: {} });
    const { container } = render(<BidExplorerView />);
    expect(
      container.querySelector("[aria-label='Loading']"),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders each history term label and its min/median values", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    // History renders as chart + sortable table: term labels
    // in the table's Term column, min/median in their own cells.
    const table = screen.getByRole("table");
    expect(within(table).getByText("AY2024/25-T1")).toBeInTheDocument();
    expect(within(table).getByText("AY2025/26-T1")).toBeInTheDocument();
    // Newest first: first body row is AY2025/26-T1 (min 14, median 28).
    const firstRow = within(table).getAllByRole("row")[1];
    expect(within(firstRow!).getByText("14.00")).toBeInTheDocument();
    expect(within(firstRow!).getByText("28.00")).toBeInTheDocument();
  });

  it("renders the prediction header range and defaults the slider to the 70% factor", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(screen.getByText("Bid Prediction")).toBeInTheDocument();
    expect(screen.getByText("Round 1 · Window 1")).toBeInTheDocument();
    // Header price range: min 18 + 0.47 x 2 = 18.94; median 30 + 0.54 x 4.
    expect(screen.getByText("e$18.94 - e$32.16")).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("4"); // index of the 70% factor
    // Median formula breakdown: 32.16 = 30.00 + (0.54 x 4.00).
    expect(screen.getByText("32.16")).toBeInTheDocument();
    expect(screen.getByText("30.00")).toBeInTheDocument();
    expect(screen.getByText("0.54")).toBeInTheDocument();
    expect(screen.getByText("4.00")).toBeInTheDocument();
  });

  it("updates the formula breakdown and header range when the slider moves", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "8" } });
    // 90%: min mult 1.24 -> 18 + 1.24 x 2 = 20.48;
    // median mult 1.37 -> 30 + 1.37 x 4 = 35.48.
    expect(screen.getByText("e$20.48 - e$35.48")).toBeInTheDocument();
    expect(screen.getByText("35.48")).toBeInTheDocument();
    expect(screen.getByText("1.37")).toBeInTheDocument();
  });

  it("renders history without slider or CTA when there is no prediction", () => {
    seedContext({
      status: "ready",
      toolInput: {},
      toolOutput: historyOnlyProps,
    });
    render(<BidExplorerView />);
    const table = screen.getByRole("table");
    expect(within(table).getByText("AY2024/25-T1")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("CTA button carries the current suggested amount only when classId + prediction exist", () => {
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(
      screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
    ).toBeInTheDocument();
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    fireEvent.change(slider, { target: { value: "8" } });
    expect(
      screen.getByRole("button", { name: "Confirm: set bid to $35.48" }),
    ).toBeInTheDocument();
  });

  it("CTA calls upsert-bid with classId, bidAmount AND bidWindowId", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
    );
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "cl1",
      bidAmount: 32.16,
      bidWindowId: 53,
      confirm: true,
    });
  });

  it("slider defaults to the 70% factor when toolOutput arrives AFTER mount (no remount)", () => {
    // Real mcp-apps hosts deliver toolOutput asynchronously after
    // ui/initialize without remounting; seed pending then reseed ready and
    // rerender to simulate that arrival on the SAME mounted component.
    seedContext({ status: "pending", toolInput: {} });
    const { rerender } = render(<BidExplorerView />);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    rerender(<BidExplorerView />);
    const slider = screen.getByRole("slider", { name: "Safety multiplier" });
    expect(slider.getAttribute("value")).toBe("4"); // index of the 70% factor
    expect(screen.getByText("32.16")).toBeInTheDocument();
  });

  it("computes the same suggestion as the shared bid math (parity pin)", async () => {
    // Slider @70%: bid-shared.suggestBidAmount(30, 0.54, 4) = 32.16 must equal
    // the view's formula median + CTA. If the view's inline formula ever
    // drifts from the canonical math again, this fails instead of the
    // screenshots.
    const { suggestBidAmount } = await import("@/server/mcp/tools/bid-shared");
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    const expected = suggestBidAmount(30, 0.54, 4);
    expect(expected).toBe(32.16);
    expect(screen.getByText(`${expected}`)).toBeInTheDocument();
    expect(screen.getByText("e$18.94 - e$32.16")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Confirm: set bid to $${expected}` }),
    ).toBeInTheDocument();
  });

  it("prediction without safety factors falls back to multiplier 1.0 (CTA still shows)", async () => {
    const noFactors = { ...fullProps, safetyFactors: [], minSafetyFactors: [] };
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: noFactors });
    render(<BidExplorerView />);
    // no slider without factors, but the CTA offers predicted + uncertainty
    expect(screen.queryByRole("slider")).toBeNull();
    const cta = screen.getByRole("button", {
      name: "Confirm: set bid to $34.00",
    });
    fireEvent.click(cta);
    await waitFor(() => expect(callTool).toHaveBeenCalledTimes(1));
    expect(callTool).toHaveBeenCalledWith({
      classId: "cl1",
      bidAmount: 34,
      bidWindowId: 53,
      confirm: true,
    });
  });

  it("does not render the CTA when the host bridge is unavailable", () => {
    mockedUseHostContext.mockReturnValue({ isAvailable: false } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    expect(screen.queryByRole("button", { name: /Set bid to/ })).toBeNull();
  });

  it("shows Saved feedback after successful upsert-bid", async () => {
    const callTool = vi.fn().mockResolvedValue({ structuredContent: {} });
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Saved/ })).toBeInTheDocument(),
    );
  });

  it("shows Failed to save when callTool rejects (v2 tool errors reject)", async () => {
    const callTool = vi.fn().mockRejectedValue(new Error("rate limited"));
    mockedUseDynamicTool.mockReturnValue({ callTool } as never);
    seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
    render(<BidExplorerView />);
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Failed to save/ }),
      ).toBeInTheDocument(),
    );
  });

  it("renders an error alert when the tool fails", () => {
    seedContext({ status: "error", toolInput: {}, error: { message: "boom" } });
    render(<BidExplorerView />);
    expect(screen.getByRole("alert")).toHaveTextContent("boom");
  });

  describe("bid prediction card (BidPredictionCard parity)", () => {
    it("renders the Bid Prediction header with the e$ recommended range in 2dp", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(screen.getByText("Bid Prediction")).toBeInTheDocument();
      // recommendedMin = 18 + 0.47 x 2 = 18.94; median = 30 + 0.54 x 4 = 32.16
      expect(screen.getByText("e$18.94 - e$32.16")).toBeInTheDocument();
    });

    it("renders the course/section/term subtitle and round/window subline", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(
        screen.getByText("COR-MGMT1202 G1 · AY2025/26-T1"),
      ).toBeInTheDocument();
      expect(screen.getByText("Round 1 · Window 1")).toBeInTheDocument();
      expect(
        screen.getByText(
          /AfterClass is not liable for any unsuccessful bids/,
        ),
      ).toBeInTheDocument();
    });

    it("renders the Odds of having other bids metric with Likely badge", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(
        screen.getByText("Odds of having other bids"),
      ).toBeInTheDocument();
      expect(screen.getByText("92.00%")).toBeInTheDocument();
      expect(screen.getByText("Likely")).toBeInTheDocument();
    });

    it("renders the Confidence Level metric with High badge", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(screen.getByText("Confidence Level")).toBeInTheDocument();
      expect(screen.getByText("81.00%")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    it("shows the Unlikely badge when the bids probability is below 0.50", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: {
          ...fullProps,
          prediction: {
            ...fullProps.prediction,
            clfHasBidsProbability: 0.2,
          },
        },
      });
      render(<BidExplorerView />);
      expect(screen.getByText("20.00%")).toBeInTheDocument();
      expect(screen.getByText("Unlikely")).toBeInTheDocument();
    });

    it("defaults the Estimated success rate slider to 70% with selectable ticks", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(screen.getByText("Estimated success rate")).toBeInTheDocument();
      const slider = screen.getByRole("slider", {
        name: "Estimated success rate",
      });
      expect(slider).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("95%")).toBeInTheDocument();
    });

    it("updates Min and Median recommendations when the success rate slider moves", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      const slider = screen.getByRole("slider", {
        name: "Estimated success rate",
      });
      // 90%: min mult 1.24 -> 18 + 1.24 x 2 = 20.48;
      // median mult 1.37 -> 30 + 1.37 x 4 = 35.48
      fireEvent.change(slider, { target: { value: "90" } });
      expect(screen.getByText("e$20.48 - e$35.48")).toBeInTheDocument();
    });

    it("renders the Formula section with Min and Median breakdowns in 2dp", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(screen.getByText("Formula")).toBeInTheDocument();
      expect(screen.getByText("Min")).toBeInTheDocument();
      expect(screen.getByText("Median")).toBeInTheDocument();
      // Default 70%: min 18 + (0.47 x 2) = 18.94; median 30 + (0.54 x 4)
      expect(screen.getByText("18.94")).toBeInTheDocument();
      expect(screen.getByText("18.00")).toBeInTheDocument();
      expect(screen.getByText("0.47")).toBeInTheDocument();
      expect(screen.getByText("2.00")).toBeInTheDocument();
      expect(screen.getByText("32.16")).toBeInTheDocument();
      expect(screen.getByText("30.00")).toBeInTheDocument();
      expect(screen.getByText("0.54")).toBeInTheDocument();
      expect(screen.getByText("4.00")).toBeInTheDocument();
    });

    it("confirms with the median-based suggested amount in 2dp", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      expect(
        screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
      ).toBeInTheDocument();
    });
  });

  describe("trend chart + filters + history table", () => {
    const multiRoundProps = {
      classId: "cl1",
      courseCode: "COR-MGMT1202",
      section: "G1",
      history: [
        {
          acadTermId: "AY2024/25-T1",
          round: "1",
          window: 1,
          min: 10,
          median: 22,
          vacancy: 45,
        },
        {
          acadTermId: "AY2024/25-T1",
          round: "1A",
          window: 2,
          min: 12,
          median: 25,
          vacancy: 40,
        },
        {
          acadTermId: "AY2025/26-T1",
          round: "1",
          window: 1,
          min: 14,
          median: 28,
          vacancy: 38,
        },
      ],
      prediction: {
        medianPredicted: 30,
        medianUncertainty: 4,
        minPredicted: 18,
        minUncertainty: 2,
        clfHasBidsProbability: 0.92,
        clfConfidenceScore: 0.81,
        bidWindow: {
          id: 53,
          acadTermId: "AY2025/26-T1",
          round: "1",
          window: 1,
        },
      },
      safetyFactors: medianSafetyFactors,
      minSafetyFactors,
    };

    it("renders an inline-SVG trend chart with min and median lines", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      const chart = screen.getByRole("img", { name: /bid trend/i });
      expect(chart.tagName.toLowerCase()).toBe("svg");
      // min + median polylines/paths
      expect(chart.querySelector('[data-series="median"]')).not.toBeNull();
      expect(chart.querySelector('[data-series="min"]')).not.toBeNull();
    });

    it("renders data-driven round and window filter toggles", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      expect(
        screen.getAllByRole("button", { name: "1" }),
      ).toHaveLength(2); // round 1 + window 1 share the plain number label
      expect(screen.getByRole("button", { name: "1A" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    });

    it("toggling a round filter narrows the chart and table", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      fireEvent.click(screen.getByRole("button", { name: "1A" }));
      const table = screen.getByRole("table");
      const rows = within(table).getAllByRole("row");
      // header + 1 filtered body row
      expect(rows).toHaveLength(2);
      expect(within(table).getByText("1A")).toBeInTheDocument();
      expect(within(table).queryByText("AY2025/26-T1")).not.toBeInTheDocument();
    });

    it("deselecting the last round filter keeps the window selection", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      const roundBtn = screen.getByRole("button", { name: "1A" });
      const windowBtn = screen.getByRole("button", { name: "2" });
      fireEvent.click(windowBtn); // select W2 first
      fireEvent.click(roundBtn); // select 1A
      fireEvent.click(roundBtn); // deselect 1A -> round filter cleared
      expect(windowBtn.getAttribute("aria-pressed")).toBe("true");
      const table = screen.getByRole("table");
      // W2 only: header + 1 body row (the 1A/W2 point)
      expect(within(table).getAllByRole("row")).toHaveLength(2);
    });

    it("zebra-stripes table rows by academic term group", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      const table = screen.getByRole("table");
      const bodyRows = within(table).getAllByRole("row").slice(1);
      // Newest first: AY2025/26-T1 (group 0, transparent), then the two
      // AY2024/25-T1 rows (group 1, shaded). Same-group rows share a
      // background; different-group rows differ.
      const bgs = bodyRows.map((r) => r.style.background);
      expect(bgs[1]).toBe(bgs[2]);
      expect(bgs[0]).not.toBe(bgs[1]);
    });

    it("sorts the history table by median when the column header is clicked", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      const medianHeader = screen.getByRole("columnheader", {
        name: /median/i,
      });
      fireEvent.click(medianHeader);
      const table = screen.getByRole("table");
      const bodyRows = within(table).getAllByRole("row").slice(1);
      // Median is the last cell of each body row (chart axis labels live
      // outside the table, so scope the query per row).
      const medians = bodyRows.map((r) => {
        const cells = within(r).getAllByRole("cell");
        return Number(cells[cells.length - 1]?.textContent);
      });
      const sorted = [...medians].sort((a, b) => a - b);
      expect(medians).toEqual(sorted);
    });

    it("shows the first 10 rows with an expand control for longer histories", () => {
      // Unique term/round/window per row: the view groups by that key
      // (mirror of BidAnalyticsClient), so duplicates would collapse.
      const longHistory = Array.from({ length: 12 }, (_, i) => ({
        acadTermId: `AY2024/25-T${(i % 3) + 1}`,
        round: "1",
        window: i + 1,
        min: 10 + i,
        median: 20 + i,
        vacancy: 40,
      }));
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: { ...multiRoundProps, history: longHistory },
      });
      render(<BidExplorerView />);
      const table = screen.getByRole("table");
      expect(within(table).getAllByRole("row")).toHaveLength(11); // header + 10
      fireEvent.click(screen.getByRole("button", { name: /show all/i }));
      expect(within(table).getAllByRole("row")).toHaveLength(13); // header + 12
    });

    it("shows the median formula breakdown in 2dp (recommend-bid-amount is viewless)", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: multiRoundProps,
      });
      render(<BidExplorerView />);
      // Median formula display (recommend-bid-amount is viewless):
      // 32.16 = 30.00 + (0.54 x 4.00) at the default 70% factor, 2dp.
      expect(screen.getByText("Formula")).toBeInTheDocument();
      expect(screen.getByText("Median")).toBeInTheDocument();
      expect(screen.getByText("32.16")).toBeInTheDocument();
      expect(screen.getByText("30.00")).toBeInTheDocument();
      expect(screen.getByText("0.54")).toBeInTheDocument();
      expect(screen.getByText("4.00")).toBeInTheDocument();
      // Header range carries the same median suggestion.
      expect(screen.getByText("e$18.94 - e$32.16")).toBeInTheDocument();
    });

    it("keeps the empty state when there is no history and no prediction", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: {
          classId: null,
          history: [],
          prediction: null,
          safetyFactors: [],
        },
      });
      render(<BidExplorerView />);
      expect(
        screen.getByText("No bid history for this combination."),
      ).toBeInTheDocument();
      expect(screen.queryByRole("img", { name: /bid trend/i })).toBeNull();
      expect(screen.queryByRole("table")).toBeNull();
    });
  });

  describe("chart label guards + grouping invariant + formula wording", () => {
    const dupHistoryProps = {
      ...fullProps,
      history: [
        {
          acadTermId: "AY2024/25-T1",
          round: "1",
          window: 1,
          min: 20,
          median: 30,
          vacancy: 45,
        },
        // Duplicate key: lowest min/median wins, single row survives.
        {
          acadTermId: "AY2024/25-T1",
          round: "1",
          window: 1,
          min: 10,
          median: 22,
          vacancy: 45,
        },
        {
          acadTermId: "AY2025/26-T1",
          round: "1",
          window: 1,
          min: 14,
          median: 28,
          vacancy: 40,
        },
      ],
    };

    it("dedupes to one row per term+round+window key (lowest min/median wins)", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: dupHistoryProps,
      });
      render(<BidExplorerView />);
      const table = screen.getByRole("table");
      // 2 unique keys -> header + 2 body rows.
      expect(within(table).getAllByRole("row")).toHaveLength(3);
      // Newest first: the deduped AY2024/25-T1 row carries
      // min 10/median 22.
      const dupRow = within(table).getAllByRole("row")[2];
      expect(within(dupRow!).getByText("10.00")).toBeInTheDocument();
      expect(within(dupRow!).getByText("22.00")).toBeInTheDocument();
      // Chart shows one dot per unique key.
      const chart = screen.getByRole("img", { name: /bid trend/i });
      expect(chart.querySelectorAll("circle")).toHaveLength(2);
    });

    it("keeps all chart labels inside the viewBox (x, y)", () => {
      const manyTerms = {
        ...fullProps,
        history: [
          {
            acadTermId: "AY2023/24-T1",
            round: "1",
            window: 1,
            min: 12.24,
            median: 18,
            vacancy: 50,
          },
          {
            acadTermId: "AY2024/25-T1",
            round: "1",
            window: 1,
            min: 10,
            median: 22,
            vacancy: 45,
          },
          {
            acadTermId: "AY2024/25-T1",
            round: "1A",
            window: 2,
            min: 12,
            median: 25,
            vacancy: 40,
          },
          {
            acadTermId: "AY2025/26-T1",
            round: "1",
            window: 1,
            min: 14,
            median: 28,
            vacancy: 38,
          },
          {
            acadTermId: "AY2026/27-T1",
            round: "1",
            window: 1,
            min: 16,
            median: 32,
            vacancy: 36,
          },
        ],
      };
      seedContext({ status: "ready", toolInput: {}, toolOutput: manyTerms });
      render(<BidExplorerView />);
      const chart = screen.getByRole("img", { name: /bid trend/i });
      const viewBox = chart.getAttribute("viewBox")!.split(" ").map(Number);
      const [, , vbW, vbH] = viewBox as [number, number, number, number];
      for (const t of Array.from(chart.querySelectorAll("text"))) {
        const x = Number(t.getAttribute("x"));
        const y = Number(t.getAttribute("y"));
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(vbW);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(vbH);
      }
    });

    it("shortens term labels and staggers them when >2 points", () => {
      expect(shortTermLabel("AY2025/26-T1")).toBe("25/26-T1");
      expect(shortTermLabel("AY2024/25-T3A")).toBe("24/25-T3A");
      // Compact DB form shortens to the same family of labels
      // ("AY202627T1" -> "26-27 T1"; see inferAcadTerm shortLabel).
      expect(shortTermLabel("AY202627T1")).toBe("26-27 T1");
      expect(shortTermLabel("AY202425T3A")).toBe("24-25 T3A");
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      const { unmount } = render(<BidExplorerView />);
      // Shortened labels regardless of point count.
      let chart = screen.getByRole("img", { name: /bid trend/i });
      expect(chart.textContent).toContain("25/26-T1");
      expect(chart.textContent).not.toContain("AY2025/26-T1");
      unmount();
      const threeTerms = {
        ...fullProps,
        history: [
          {
            acadTermId: "AY2023/24-T1",
            round: "1",
            window: 1,
            min: 12.24,
            median: 18,
            vacancy: 50,
          },
          {
            acadTermId: "AY2024/25-T1",
            round: "1",
            window: 1,
            min: 10,
            median: 22,
            vacancy: 45,
          },
          {
            acadTermId: "AY2025/26-T1",
            round: "1",
            window: 1,
            min: 14,
            median: 28,
            vacancy: 38,
          },
        ],
      };
      seedContext({ status: "ready", toolInput: {}, toolOutput: threeTerms });
      render(<BidExplorerView />);
      chart = screen.getByRole("img", { name: /bid trend/i });
      // 3 points: staggered two-row labels — at least two
      // distinct y values.
      const labelYs = Array.from(chart.querySelectorAll("text"))
        .map((t) => Number(t.getAttribute("y")))
        .filter((yy) => yy > 150);
      expect(new Set(labelYs).size).toBeGreaterThanOrEqual(2);
    });

    it("renders the current term highlight with no now text", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      render(<BidExplorerView />);
      const chart = screen.getByRole("img", { name: /bid trend/i });
      const texts = Array.from(chart.querySelectorAll("text"));
      expect(texts.find((t) => t.textContent === "now")).toBeUndefined();
      // Current term highlight rect renders when the term is visible.
      const highlights = Array.from(chart.querySelectorAll("rect")).filter(
        (r) => r.getAttribute("fill") === "#2563eb",
      );
      expect(highlights).toHaveLength(1);
    });
  });

  describe("nullable branches (view-level graceful render)", () => {
    it("renders history rows with vacancy:null (no crash, no 'null' text)", () => {
      // Adapter-level vacancy:null is covered in adapters.test.ts:110; the
      // View ignores vacancy (min/median chart + table only) and must pass
      // the rows through untouched.
      const nullVacancyProps = {
        ...fullProps,
        history: fullProps.history.map((h) => ({ ...h, vacancy: null })),
      };
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: nullVacancyProps,
      });
      render(<BidExplorerView />);
      const table = screen.getByRole("table");
      expect(within(table).getByText("AY2024/25-T1")).toBeInTheDocument();
      expect(within(table).getByText("AY2025/26-T1")).toBeInTheDocument();
      expect(
        screen.getByRole("img", { name: /bid trend/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText("null")).toBeNull();
    });

    it("renders the additive suggestion when minPredicted is null", () => {
      const nullMinProps = {
        ...fullProps,
        prediction: { ...fullProps.prediction, minPredicted: null },
      };
      seedContext({ status: "ready", toolInput: {}, toolOutput: nullMinProps });
      // Additive suggestion: 30 + 0.54 x 4 = 32.16.
      const { container } = render(<BidExplorerView />);
      expect(container.textContent).toContain("32.16");
      // Min formula row shows em-dash placeholders without a prediction.
      expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("30.00")).toBeInTheDocument();
      expect(screen.getByText("0.54")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("null")).toBeNull();
    });

    it("renders the history chart, filters, and table below the prediction section when history is present", () => {
      seedContext({ status: "ready", toolInput: {}, toolOutput: fullProps });
      const { container } = render(<BidExplorerView />);
      expect(
        screen.getByRole("img", { name: /bid trend/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole("table")).toBeInTheDocument();
      // Order: prediction header -> formula -> chart -> filters -> table.
      const text = container.textContent ?? "";
      expect(text.indexOf("Bid Prediction")).toBeLessThan(
        text.indexOf("Historical Bidding Trend"),
      );
      expect(text.indexOf("Historical Bidding Trend")).toBeLessThan(
        text.indexOf("AY2024/25-T1"),
      );
    });

    it("renders prediction + filters gracefully when history rows are absent (tool-dropped null min/median)", () => {
      // explore-bid-options drops rows with null min/median server-side; when
      // every row is dropped the View sees history:[] WITH a prediction and
      // must show the prediction block plus the filtered-empty note (not the
      // fully-empty state, not a crash).
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: { ...fullProps, history: [] },
      });
      render(<BidExplorerView />);
      expect(screen.getByText("Bid Prediction")).toBeInTheDocument();
      // No history at all: no chart, filters, table, or filtered-empty note
      // (those render only when history rows exist).
      expect(
        screen.queryByText("No bid data available for the selected filters."),
      ).toBeNull();
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByRole("img", { name: /bid trend/i })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Confirm: set bid to $32.16" }),
      ).toBeInTheDocument();
    });

    it("shows only rounds/windows with positive bid data", () => {
      seedContext({
        status: "ready",
        toolInput: {},
        toolOutput: {
          classId: "cl1",
          history: [
            {
              acadTermId: "AY2025/26-T1",
              round: "1",
              window: 1,
              min: 14,
              median: 28,
              vacancy: 40,
            },
            {
              acadTermId: "AY2025/26-T1",
              round: "1A",
              window: 2,
              min: 0,
              median: 0,
              vacancy: 20,
            },
            {
              acadTermId: "AY2025/26-T1",
              round: "2",
              window: 3,
              min: 0,
              median: 0,
              vacancy: 20,
            },
          ],
          prediction: null,
          safetyFactors: [],
        },
      });
      render(<BidExplorerView />);
      expect(
        screen.getAllByRole("button", { name: "1" }),
      ).toHaveLength(2); // round 1 + window 1 share the plain number label
      expect(screen.queryByRole("button", { name: "1A" })).toBeNull();
      expect(screen.queryByRole("button", { name: "2" })).toBeNull();
    });
  });
});
