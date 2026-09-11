// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReasoningCard } from "./reasoning-card";

describe("ReasoningCard", () => {
  it("renders collapsed by default with a Show thinking affordance", () => {
    render(<ReasoningCard text="let me think step by step" />);
    expect(screen.getByRole("button", { expanded: false })).toBeDefined();
    expect(screen.getByText("Show thinking")).toBeDefined();
    expect(screen.queryByText("let me think step by step")).toBeNull();
  });

  it("expands on click to reveal text and toggles aria-expanded", () => {
    render(<ReasoningCard text="let me think step by step" />);
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("button", { expanded: true })).toBeDefined();
    expect(screen.getByText("let me think step by step")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.getByRole("button", { expanded: false })).toBeDefined();
    expect(screen.queryByText("let me think step by step")).toBeNull();
  });

  it("never renders empty when text is blank or whitespace", () => {
    const { container: blank } = render(<ReasoningCard text="" />);
    expect(blank.innerHTML).toBe("");
    const { container: spaces } = render(<ReasoningCard text={"   \n\t  "} />);
    expect(spaces.innerHTML).toBe("");
  });

  it("auto-expands while streaming with a Thinking affordance", () => {
    render(<ReasoningCard text="streaming thought" isStreaming />);
    expect(screen.getByRole("button", { expanded: true })).toBeDefined();
    expect(screen.getByText(/thinking/i)).toBeDefined();
    expect(screen.getByText("streaming thought")).toBeDefined();
  });

  it("collapses back when streaming ends without a user toggle", () => {
    const { rerender } = render(
      <ReasoningCard text="streaming thought" isStreaming />,
    );
    expect(screen.getByRole("button", { expanded: true })).toBeDefined();
    rerender(<ReasoningCard text="streaming thought" isStreaming={false} />);
    expect(screen.getByRole("button", { expanded: false })).toBeDefined();
    expect(screen.queryByText("streaming thought")).toBeNull();
  });
});
