// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantErrorMessage,
  DEFAULT_CHAT_ERROR_MESSAGE,
  shouldShowChatError,
  toFriendlyError,
} from "./error-message";

describe("toFriendlyError", () => {
  it("returns a friendly message for any error", () => {
    expect(toFriendlyError(new Error("[POST /api/chat] 500: upstream failure"))).toBe(
      DEFAULT_CHAT_ERROR_MESSAGE,
    );
  });

  it("never echoes raw error text that may contain internals", () => {
    const raw = "POST /api/chat 500: db connection refused at 10.0.0.5:5432";
    const out = toFriendlyError(new Error(raw));
    expect(out).not.toContain("db connection refused");
    expect(out).not.toContain("10.0.0.5");
  });

  it("falls back to the friendly message when there is no error object", () => {
    expect(toFriendlyError(undefined)).toBe(DEFAULT_CHAT_ERROR_MESSAGE);
  });
});

describe("shouldShowChatError (shared showError wiring in chat-panel.tsx / chat-page.tsx)", () => {
  it("excludes quota gate errors - the ConnectGate/onGate surface handles them", () => {
    expect(shouldShowChatError(new Error('[POST /api/chat] 403: {"gate":"quota"}'))).toBe(false);
  });

  it("excludes spend gate errors", () => {
    expect(shouldShowChatError(new Error('{"gate":"spend"}'))).toBe(false);
  });

  it("shows the bubble for any non-gate error", () => {
    expect(shouldShowChatError(new Error("Network request failed"))).toBe(true);
    expect(shouldShowChatError("a plain string error")).toBe(true);
  });

  it("shows no bubble when there is no error", () => {
    expect(shouldShowChatError(null)).toBe(false);
    expect(shouldShowChatError(undefined)).toBe(false);
  });
});

describe("AssistantErrorMessage", () => {
  it("renders an alert with the friendly message and a Try again button", () => {
    render(<AssistantErrorMessage error={new Error("boom")} onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(DEFAULT_CHAT_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("does not leak the raw error text into the DOM", () => {
    render(<AssistantErrorMessage error={new Error("secret internal detail")} onRetry={vi.fn()} />);
    expect(screen.queryByText(/secret internal detail/i)).toBeNull();
  });

  it("calls onRetry when Try again is clicked", () => {
    const onRetry = vi.fn();
    render(<AssistantErrorMessage error={new Error("boom")} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
