// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchResultEmpty } from "./SearchResultEmpty";

describe("SearchResultEmpty", () => {
  it("asks for more characters when the reason is short", () => {
    render(<SearchResultEmpty show reason="short" query="i" />);

    expect(screen.getByText("Type 2 or more characters.")).toBeInTheDocument();
    expect(screen.queryByText(/No results/)).not.toBeInTheDocument();
  });

  it("echoes the query when the reason is none", () => {
    render(<SearchResultEmpty show reason="none" query="xyz" />);

    expect(screen.getByText("No results for “xyz”.")).toBeInTheDocument();
    expect(
      screen.queryByText("Type 2 or more characters."),
    ).not.toBeInTheDocument();
  });
});
