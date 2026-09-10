// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TOKENS } from "../tokens";
import { RangeRow } from "./RangeRow";

describe("RangeRow", () => {
  it("renders the label and the min–median range text", () => {
    render(
      <RangeRow
        label="Predicted"
        min={18}
        median={30}
        max={50}
        c={TOKENS.light}
      />,
    );
    expect(screen.getByText("Predicted")).toBeInTheDocument();
    expect(screen.getByText("$18–$30")).toBeInTheDocument();
  });

  it("renders dashed (prediction) variant without crashing", () => {
    const { container } = render(
      <RangeRow
        label="Predicted"
        min={18}
        median={30}
        max={50}
        dashed
        c={TOKENS.dark}
      />,
    );
    expect(screen.getByText("$18–$30")).toBeInTheDocument();
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
