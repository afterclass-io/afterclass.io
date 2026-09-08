// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("ToolCallCard", () => {
  it("renders finished calls collapsed with no output visible", () => {
    const { container } = render(
      <ToolCallCard part={donePart} stepIndex={1} stepTotal={2} />,
    );
    expect(screen.getByRole("button", { expanded: false })).toBeDefined();
    // Output is rendered via JSON.stringify (with quotes); regex matches the substring.
    expect(screen.queryByText(/some result text/)).toBeNull();
    expect(container.querySelector("pre")).toBeNull();
  });

  it("expands output on header click and collapses on second click", () => {
    render(<ToolCallCard part={donePart} stepIndex={1} stepTotal={2} />);
    const header = screen.getByRole("button", { expanded: false });
    fireEvent.click(header);
    expect(screen.getByText(/some result text/)).toBeDefined();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByText(/some result text/)).toBeNull();
  });

  it("renders running calls collapsed until clicked", () => {
    render(<ToolCallCard part={runningPart} stepIndex={1} stepTotal={2} />);
    expect(screen.getByRole("button", { expanded: false })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("button", { expanded: true })).toBeDefined();
  });
});
