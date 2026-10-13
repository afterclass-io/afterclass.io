// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Characterization (markup) tests: pin the rendered card shell of the ready
// state so the shared card chrome can change without changing the output.
vi.mock("mcp-use/react", () => ({
  useToolContext: vi.fn(),
  useViewTheme: vi.fn(),
}));

import BidPlanView from "./view";
import { useToolContext, useViewTheme } from "mcp-use/react";

const mockedUseToolContext = vi.mocked(useToolContext);
const mockedUseViewTheme = vi.mocked(useViewTheme);

const readyOutput = {
  acadTermId: "AY2026/27-T1",
  budget: { balance: 987.5 },
  bids: [
    {
      id: "b1",
      bidAmount: 25,
      status: "PLANNED",
      courseCode: "ACCT102",
      courseName: "Management Accounting",
      section: "G1",
      professorName: "FANG Bingxu",
      round: "1",
      window: 1,
    },
    {
      id: "b2",
      bidAmount: 51,
      status: "SECURED",
      courseCode: "CS301",
      courseName: "IT Solution Architecture",
      section: "G3",
      professorName: null,
      round: "1A",
      window: 2,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BidPlanView markup", () => {
  it.each(["light", "dark"] as const)(
    "ready state keeps the card markup (%s)",
    (theme) => {
      mockedUseViewTheme.mockReturnValue(theme);
      mockedUseToolContext.mockReturnValue({
        status: "ready",
        toolOutput: readyOutput,
      } as never);
      const { container } = render(<BidPlanView />);
      expect(container.innerHTML).toMatchSnapshot();
    },
  );
});
