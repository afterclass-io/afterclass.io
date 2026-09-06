// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TOKENS } from "../tokens";
import { ToggleButton } from "./ToggleButton";

describe("ToggleButton", () => {
  it("renders the label with aria-pressed=false when unpressed", () => {
    render(
      <ToggleButton
        label="1A"
        pressed={false}
        onClick={vi.fn()}
        c={TOKENS.light}
      />,
    );
    const btn = screen.getByRole("button", { name: "1A" });
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("renders pressed state and fires onClick", () => {
    const onClick = vi.fn();
    render(
      <ToggleButton
        label="1A"
        pressed={true}
        onClick={onClick}
        c={TOKENS.dark}
      />,
    );
    const btn = screen.getByRole("button", { name: "1A" });
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
