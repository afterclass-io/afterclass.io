// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCtaFeedback, useKeyedCtaFeedback } from "./use-cta-feedback";

/** Single-CTA harness: the aria-label mirrors the feedback state. */
function SingleHarness() {
  const { feedback, showFeedback } = useCtaFeedback(50);
  const label =
    feedback === "saved" ? "Saved ✓" : feedback === "error" ? "Failed" : "Do it";
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => showFeedback("saved")}
    />
  );
}

/** Per-row harness: feedback is keyed by row id. */
function KeyedHarness() {
  const { feedback, showFeedback } = useKeyedCtaFeedback(50);
  return (
    <button
      type="button"
      aria-label={feedback.a === "saved" ? "Row A saved ✓" : "Add row A"}
      onClick={() => showFeedback("a", "saved")}
    />
  );
}

describe("shared useCtaFeedback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the saved state after a successful call and resets to idle", () => {
    render(<SingleHarness />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Do it");

    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toBe("Saved ✓");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(btn.getAttribute("aria-label")).toBe("Do it");
  });

  it("keyed variant tracks per-row feedback and clears only that row", () => {
    render(<KeyedHarness />);
    const btn = screen.getByRole("button");
    expect(btn.getAttribute("aria-label")).toBe("Add row A");

    fireEvent.click(btn);
    expect(btn.getAttribute("aria-label")).toBe("Row A saved ✓");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(btn.getAttribute("aria-label")).toBe("Add row A");
  });
});
