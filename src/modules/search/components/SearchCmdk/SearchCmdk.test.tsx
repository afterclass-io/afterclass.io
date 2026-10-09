// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/common/providers/ProgressProvider", () => ({
  useProgress: () => ({ start: vi.fn(), done: vi.fn() }),
}));

vi.mock("@/common/hooks", () => ({
  useEdgeConfigs: () => ({ enableCmdkTooltip: false }),
}));

import { SearchCmdk } from "./SearchCmdk";

describe("SearchCmdk", () => {
  it("names the submit link by its visible text", () => {
    render(
      <SearchCmdk asChild>
        <button type="button">Open search</button>
      </SearchCmdk>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));

    expect(screen.getByRole("link", { name: "Search" })).toHaveAttribute(
      "href",
      "/search?q=",
    );
    expect(
      screen.queryByRole("link", { name: "close" }),
    ).not.toBeInTheDocument();
  });
});
