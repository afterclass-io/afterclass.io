// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
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

const fullProps = {
  classId: "cl1",
  acadTermId: "t1",
  bidWindow: { id: 53, round: "1", window: 1 },
  predictedMedian: 25,
  suggestedBidAmount: 26.25,
  multiplierUsed: { beatsPercentage: 70, multiplier: 1.05 },
  rationale: "Predicted median 25 x safety multiplier 1.05 (beats 70% of bids).",
};

describe("bid-recommendation widgetMetadata", () => {
  // `WidgetMetadata.props` is typed `z.ZodTypeAny | InputDefinition[] | undefined`;
  // narrow to the Zod schema the widget actually registers (`bidRecommendationPropsSchema`).
  const propsSchema = widgetMetadata.props! as z.ZodTypeAny;

  it("parses the shape the tool's toWidgetProps produces", () => {
    expect(propsSchema.safeParse(fullProps).success).toBe(true);
  });

  it("accepts a minimal shape (no multiplier/rationale/bidWindow)", () => {
    const minimal = { classId: "cl1", acadTermId: "t1", predictedMedian: 25, suggestedBidAmount: 25 };
    expect(propsSchema.safeParse(minimal).success).toBe(true);
  });
});

describe("bid-recommendation widget render", () => {
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
    expect(screen.getByText(/Predicted median: \$25/)).toBeTruthy();
    expect(screen.getByText(/Safety multiplier: 1.05/)).toBeTruthy();
    // `(beats 70%)` (with closing paren) targets only the multiplier row - the
    // rationale fixture also contains "beats 70%" ("...(beats 70% of bids)."), which
    // would make a bare `/beats 70%/` query ambiguous.
    expect(screen.getByText(/\(beats 70%\)/)).toBeTruthy();
    expect(screen.getByText(/safety multiplier 1.05/)).toBeTruthy();
  });

  it("omits optional rows when absent", () => {
    renderBidRecommendation({ classId: "cl2", acadTermId: "t1", suggestedBidAmount: 20 });
    expect(screen.queryByText(/Predicted median/)).toBeNull();
    expect(screen.queryByText(/Safety multiplier/)).toBeNull();
  });
});
