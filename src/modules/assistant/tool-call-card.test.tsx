// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToolCallCard } from "./tool-call-card";
import type { ToolPart } from "./tool-part";

const donePart = {
  type: "tool-search-courses",
  state: "output-available",
  toolCallId: "t1",
  input: { query: "IS" },
  output: "some result text",
} as unknown as ToolPart;

const runningPart = {
  type: "tool-search-courses",
  state: "input-available",
  toolCallId: "t2",
  input: { query: "IS" },
} as unknown as ToolPart;

// Native <details>/<summary>: assert on the details open attribute.
function details(): HTMLElement {
  return document.querySelector("details")!;
}

describe("ToolCallCard", () => {
  it("renders finished calls collapsed", () => {
    render(<ToolCallCard part={donePart} stepIndex={1} stepTotal={2} />);
    expect(details().hasAttribute("open")).toBe(false);
    expect(screen.getByText("search-courses")).toBeDefined();
    expect(screen.getByText("Step 1/2")).toBeDefined();
  });

  it("renders running calls with a Running indicator", () => {
    render(<ToolCallCard part={runningPart} stepIndex={1} stepTotal={2} />);
    expect(details().hasAttribute("open")).toBe(false);
    expect(screen.getByLabelText("Running")).toBeDefined();
  });

  it("shows error text for failed calls", () => {
    const errPart = {
      type: "tool-search-courses",
      state: "output-error",
      toolCallId: "t3",
      input: { query: "IS" },
      errorText: "boom failed",
    } as unknown as ToolPart;
    render(<ToolCallCard part={errPart} stepIndex={1} stepTotal={1} />);
    expect(screen.getByLabelText("Error")).toBeDefined();
  });
});
