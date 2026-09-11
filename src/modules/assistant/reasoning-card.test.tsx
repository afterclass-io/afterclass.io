// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReasoningCard } from "./reasoning-card";

// Native <details>/<summary>: jsdom exposes no button role, so assert on
// the summary affordance + the details open attribute instead.
function details(): HTMLElement {
  return document.querySelector("details")!;
}

describe("ReasoningCard", () => {
  it("renders collapsed by default with a Show thinking affordance", () => {
    render(<ReasoningCard text="let me think step by step" />);
    expect(details().hasAttribute("open")).toBe(false);
    expect(screen.getByText("Show thinking")).toBeDefined();
  });

  it("reveals text when opened", () => {
    render(<ReasoningCard text="let me think step by step" />);
    // jsdom does not toggle <details> on summary click (browser behavior),
    // so drive the open attribute directly — the content renders inside.
    details().setAttribute("open", "");
    expect(screen.getByText("let me think step by step")).toBeDefined();
    fireEvent.click(screen.getByText("Show thinking"));
  });

  it("never renders empty when text is blank or whitespace", () => {
    const { container: blank } = render(<ReasoningCard text="" />);
    expect(blank.innerHTML).toBe("");
    const { container: spaces } = render(<ReasoningCard text={"   \n\t  "} />);
    expect(spaces.innerHTML).toBe("");
  });

  it("starts open while streaming with a Thinking affordance", () => {
    render(<ReasoningCard text="streaming thought" isStreaming />);
    expect(details().hasAttribute("open")).toBe(true);
    expect(screen.getByText(/thinking/i)).toBeDefined();
  });

  it("starts collapsed once streaming ends", () => {
    const { rerender } = render(
      <ReasoningCard text="streaming thought" isStreaming />,
    );
    expect(details().hasAttribute("open")).toBe(true);
    rerender(<ReasoningCard text="streaming thought" isStreaming={false} />);
    expect(details().hasAttribute("open")).toBe(false);
  });
});
