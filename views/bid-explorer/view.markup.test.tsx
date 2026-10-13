// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization (markup) tests: pin the rendered DOM of the repeated
// prediction regions (Odds/Confidence bar rows and the Min/Median formula
// breakdown) so the local helpers that dedupe them cannot change output.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
  useHostContext: vi.fn(),
  useDynamicTool: vi.fn(),
}));

import BidExplorerView from "./view";
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

const bidWindow = {
  id: 53,
  acadTermId: "AY2025/26-T1",
  round: "1",
  window: 1,
};

// High odds and high confidence: "Likely" pill and "Very High" label.
const highProps = {
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
    bidWindow,
  },
  safetyFactors: medianSafetyFactors,
  minSafetyFactors,
};

// Low odds and low confidence: "Unlikely" pill and "Low" label. Median
// lands under the BOSS floor (3 + 0.54 x 1 < 10), so the floored note
// renders, and a null minPredicted takes the placeholder fallback branch.
const lowProps = {
  ...highProps,
  prediction: {
    medianPredicted: 3,
    medianUncertainty: 1,
    minPredicted: null,
    minUncertainty: 2,
    clfHasBidsProbability: 0.2,
    clfConfidenceScore: 0.4,
    bidWindow,
  },
};

// No classifier outputs: the Odds and Confidence rows are not rendered.
const noClfProps = {
  ...highProps,
  prediction: {
    ...highProps.prediction,
    clfHasBidsProbability: null,
    clfConfidenceScore: null,
  },
};

function seedReady(toolOutput: unknown) {
  mockedUseToolContext.mockReturnValue({
    status: "ready",
    toolInput: {},
    toolOutput,
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedUseViewTheme.mockReturnValue("light");
  mockedUseHostContext.mockReturnValue({ isAvailable: true } as never);
  mockedUseDynamicTool.mockReturnValue({
    callTool: vi.fn().mockResolvedValue({ structuredContent: {} }),
  } as never);
});

describe("BidExplorerView markup (characterization)", () => {
  it("pins the high odds / high confidence prediction markup", () => {
    seedReady(highProps);
    const { container } = render(<BidExplorerView />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("pins the low odds / floored median prediction markup", () => {
    seedReady(lowProps);
    const { container } = render(<BidExplorerView />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("pins the markup when the classifier outputs are absent", () => {
    seedReady(noClfProps);
    const { container } = render(<BidExplorerView />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it("pins the high-confidence markup in dark theme", () => {
    mockedUseViewTheme.mockReturnValue("dark");
    seedReady(highProps);
    const { container } = render(<BidExplorerView />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
