// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ClassInfoButton } from "./ClassInfoButton";

const LONG_NAME =
  "Special Topics in Advanced Computational Methods for Financial Risk Analytics";

describe("ClassInfoButton", () => {
  it("truncates a long class name instead of wrapping it", () => {
    render(<ClassInfoButton onClick={vi.fn()}>{LONG_NAME}</ClassInfoButton>);

    const button = screen.getByRole("button", { name: LONG_NAME });
    expect(button).toHaveClass("block", "max-w-full", "truncate");
    expect(button).not.toHaveClass("break-words");
  });

  it("exposes the full name through the title attribute", () => {
    render(
      <ClassInfoButton onClick={vi.fn()} title={LONG_NAME}>
        {LONG_NAME}
      </ClassInfoButton>,
    );

    expect(screen.getByRole("button")).toHaveAttribute("title", LONG_NAME);
  });

  it("calls onClick when pressed", () => {
    const onClick = vi.fn();
    render(<ClassInfoButton onClick={onClick}>IS215</ClassInfoButton>);

    fireEvent.click(screen.getByRole("button", { name: "IS215" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
