"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/common/components/button";
import { parseChatError, parseGateError } from "./gate";

/** Fixed friendly copy for a failed assistant turn. Deliberately generic: the
 *  transport error can contain internals (e.g. `[POST /api/chat] 500: ...`),
 *  so we never echo raw error text verbatim. */
export const DEFAULT_CHAT_ERROR_MESSAGE =
  "Something went wrong while sending your message. Please try again.";

/**
 * Whether a retry makes sense for a chat error. Retrying a rejected payload
 * (too-large / invalid-request) or a signed-out session (unauthorized) cannot
 * succeed without the user changing something first, so the Try again button
 * is hidden for those classes.
 */
export function isRetryableChatError(error: unknown): boolean {
  const cls = parseChatError(error);
  return (
    cls !== "too-large" && cls !== "invalid-request" && cls !== "unauthorized"
  );
}

/** Sanitize a chat error into user-safe copy. Gate errors (quota/consent) are
 *  handled by the ConnectGate surface; anything reaching this bubble maps to
 *  fixed copy per class — raw error text is never echoed (it can contain
 *  internals like `[POST /api/chat] 500: ...`). */
export function toFriendlyError(error: unknown): string {
  switch (parseChatError(error)) {
    case "rate-limited":
      return "You're sending messages too quickly. Wait a moment and try again.";
    case "turn-in-flight":
      return "Your previous message is still being answered. Wait for it to finish, then try again.";
    case "too-large":
      return "That message is too large to send. Try shortening it and send again.";
    case "unavailable":
    case "disabled":
      return "The assistant is temporarily unavailable. Please try again in a bit.";
    case "unauthorized":
      return "You were signed out. Sign in again and retry.";
    case "invalid-request":
      return "That message could not be sent. Change it and try again.";
    case "failed":
    case null:
    default:
      return DEFAULT_CHAT_ERROR_MESSAGE;
  }
}

/**
 * Whether a chat error should render the generic error bubble. Gate errors
 * (quota/consent) are routed to the ConnectGate/onGate surface instead - never
 * show both the gate surface and the error bubble. This is the shared `showError`
 * wiring used by both chat surfaces (chat-panel.tsx and chat-page.tsx).
 */
export function shouldShowChatError(error: unknown): boolean {
  return error != null && parseGateError(error) == null;
}

export type AssistantErrorMessageProps = {
  error: unknown;
  onRetry: () => void;
};

export function AssistantErrorMessage({
  error,
  onRetry,
}: AssistantErrorMessageProps) {
  return (
    <div className="flex justify-start px-4 pb-1" role="alert">
      <div className="border-destructive/40 bg-destructive/10 text-destructive w-fit max-w-[min(85%,56ch)] rounded-2xl rounded-bl-sm border px-3.5 py-2 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{toFriendlyError(error)}</span>
        </div>
        {isRetryableChatError(error) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive mt-2 h-7 text-xs"
          >
            <RotateCwIcon className="size-3.5" aria-hidden="true" />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
