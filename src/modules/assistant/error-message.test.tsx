// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AssistantErrorMessage,
  DEFAULT_CHAT_ERROR_MESSAGE,
  isRetryableChatError,
  shouldShowChatError,
  toFriendlyError,
} from "./error-message";

describe("toFriendlyError", () => {
  it("returns a friendly message for any error", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 500: upstream failure")),
    ).toBe(DEFAULT_CHAT_ERROR_MESSAGE);
  });

  it("maps rate-limited (429) to a wait-and-retry message", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 429: Rate limit exceeded")),
    ).toBe("You're sending messages too quickly. Wait a moment and try again.");
  });

  it("maps turn-in-flight (429 previous turn running) to a wait-for-finish message", () => {
    expect(
      toFriendlyError(
        new Error("[POST /api/chat] 429: A previous turn is still running"),
      ),
    ).toBe(
      "Your previous message is still being answered. Wait for it to finish, then try again.",
    );
  });

  it("maps too-large (413) to a shorten-and-resend message", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 413: Request too large")),
    ).toBe(
      "That message is too large to send. Try shortening it and send again.",
    );
  });

  it("maps invalid-request (400) to a revise-and-resend message", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 400: Invalid request body")),
    ).toBe("That message could not be sent. Change it and try again.");
  });

  it("maps unavailable (503) to a temporarily-unavailable message", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 503: Assistant unavailable")),
    ).toBe(
      "The assistant is temporarily unavailable. Please try again in a bit.",
    );
  });

  it("maps 500 Assistant unavailable (sync failure after reservation) to unavailable copy", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 500: Assistant unavailable")),
    ).toBe(
      "The assistant is temporarily unavailable. Please try again in a bit.",
    );
  });

  it("maps disabled (503 kill-switch) to the same copy as unavailable", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 503: Assistant disabled")),
    ).toBe(
      "The assistant is temporarily unavailable. Please try again in a bit.",
    );
  });

  it("maps unauthorized (401) to a signed-out message", () => {
    expect(
      toFriendlyError(new Error("[POST /api/chat] 401: Unauthorized")),
    ).toBe("You were signed out. Sign in again and retry.");
  });

  it("maps network / unknown failures to the default message", () => {
    expect(toFriendlyError(new Error("Network request failed"))).toBe(
      DEFAULT_CHAT_ERROR_MESSAGE,
    );
    expect(toFriendlyError(new Error("boom"))).toBe(DEFAULT_CHAT_ERROR_MESSAGE);
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

describe("isRetryableChatError", () => {
  it("hides retry for too-large, invalid-request, and unauthorized", () => {
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 413: Request too large"),
      ),
    ).toBe(false);
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 400: Invalid request body"),
      ),
    ).toBe(false);
    expect(
      isRetryableChatError(new Error("[POST /api/chat] 401: Unauthorized")),
    ).toBe(false);
  });

  it("keeps retry for rate-limited, turn-in-flight, unavailable, disabled, and failed", () => {
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 429: Rate limit exceeded"),
      ),
    ).toBe(true);
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 429: A previous turn is still running"),
      ),
    ).toBe(true);
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 503: Assistant unavailable"),
      ),
    ).toBe(true);
    expect(
      isRetryableChatError(
        new Error("[POST /api/chat] 503: Assistant disabled"),
      ),
    ).toBe(true);
    expect(
      isRetryableChatError(new Error("[POST /api/chat] 500: upstream failure")),
    ).toBe(true);
    expect(isRetryableChatError(new Error("Network request failed"))).toBe(
      true,
    );
  });
});

describe("shouldShowChatError (shared showError wiring in chat-panel.tsx / chat-page.tsx)", () => {
  it("excludes quota gate errors - the ConnectGate/onGate surface handles them", () => {
    expect(
      shouldShowChatError(new Error('[POST /api/chat] 403: {"gate":"quota"}')),
    ).toBe(false);
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
    render(
      <AssistantErrorMessage error={new Error("boom")} onRetry={vi.fn()} />,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(DEFAULT_CHAT_ERROR_MESSAGE)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("does not leak the raw error text into the DOM", () => {
    render(
      <AssistantErrorMessage
        error={new Error("secret internal detail")}
        onRetry={vi.fn()}
      />,
    );
    expect(screen.queryByText(/secret internal detail/i)).toBeNull();
  });

  it("calls onRetry when Try again is clicked", () => {
    const onRetry = vi.fn();
    render(
      <AssistantErrorMessage error={new Error("boom")} onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the rate-limited copy for a 429 rate-limit error", () => {
    render(
      <AssistantErrorMessage
        error={new Error("[POST /api/chat] 429: Rate limit exceeded")}
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "You're sending messages too quickly. Wait a moment and try again.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
  });

  it("hides the Try again button for non-retryable errors (too-large)", () => {
    render(
      <AssistantErrorMessage
        error={new Error("[POST /api/chat] 413: Request too large")}
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "That message is too large to send. Try shortening it and send again.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("hides the Try again button for non-retryable errors (unauthorized)", () => {
    render(
      <AssistantErrorMessage
        error={new Error("[POST /api/chat] 401: Unauthorized")}
        onRetry={vi.fn()}
      />,
    );
    expect(
      screen.getByText("You were signed out. Sign in again and retry."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });
});
