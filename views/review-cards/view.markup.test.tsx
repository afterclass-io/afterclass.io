// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization (markup) tests: pin the rendered card shell of the ready
// state (with reviews and the empty state) so the shared card chrome can
// change without changing the output.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
}));

import ReviewCardsView from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const readyOutput = {
  context: "ACCT102",
  reviews: [
    {
      id: "rv1",
      body: "Heavy group work but fair grading.",
      tips: "Start the project early.",
      rating: 4,
      labels: ["Group Work", "Fair"],
      voteCount: 12,
      createdAt: "2026-01-15T00:00:00.000Z",
      courseCode: "ACCT102",
      professorName: "FANG Bingxu",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReviewCardsView markup", () => {
  it.each(["light", "dark"] as const)(
    "ready state keeps the card markup (%s)",
    (theme) => {
      mockedUseViewTheme.mockReturnValue(theme);
      mockedUseToolContext.mockReturnValue({
        status: "ready",
        toolOutput: readyOutput,
      } as never);
      const { container } = render(<ReviewCardsView />);
      expect(container.innerHTML).toMatchSnapshot();
    },
  );

  it("empty ready state keeps the card markup", () => {
    mockedUseViewTheme.mockReturnValue("light");
    mockedUseToolContext.mockReturnValue({
      status: "ready",
      toolOutput: { context: "", reviews: [] },
    } as never);
    const { container } = render(<ReviewCardsView />);
    expect(container.innerHTML).toMatchSnapshot();
  });
});
