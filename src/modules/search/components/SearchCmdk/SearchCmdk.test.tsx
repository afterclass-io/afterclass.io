// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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

  const openAndType = (value: string) => {
    render(
      <SearchCmdk asChild>
        <button type="button">Open search</button>
      </SearchCmdk>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value } });
    fireEvent.submit(input);
  };

  it("keeps the dialog open and shows the helper for a one-character query", () => {
    push.mockClear();
    openAndType("i");

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Type 2 or more characters.",
    );
    expect(screen.getByRole("status")).toHaveClass("text-error");
  });

  it("navigates for a two-character query", () => {
    push.mockClear();
    openAndType(" is ");

    expect(push).toHaveBeenCalledWith("/search?q=is");
  });

  it("keeps the dialog open when the Search link is clicked on a short query", () => {
    render(
      <SearchCmdk asChild>
        <button type="button">Open search</button>
      </SearchCmdk>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "i" } });
    fireEvent.click(screen.getByRole("link", { name: "Search" }));

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("text-error");
  });

  it("tells the user to press Enter once the query is long enough", () => {
    render(
      <SearchCmdk asChild>
        <button type="button">Open search</button>
      </SearchCmdk>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open search" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "is" } });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Press Enter to search.",
    );
  });
});
