"use client";

import { AlertTriangleIcon, RotateCwIcon } from "lucide-react";
import { parseGateError } from "./gate";

/** Fixed friendly copy for a failed assistant turn. Deliberately generic: the
 *  transport error can contain internals (e.g. `[POST /api/chat] 500: ...`),
 *  so we never echo raw error text verbatim. */
export const DEFAULT_CHAT_ERROR_MESSAGE =
  "Something went wrong while sending your message. Please try again.";

/** Sanitize a chat error into user-safe copy. Gate errors (quota/spend) are
 *  handled by the ConnectGate surface, so any error that reaches this bubble
 *  is an unexpected failure - a friendly generic message is always correct. */
export function toFriendlyError(_error: unknown): string {
  return DEFAULT_CHAT_ERROR_MESSAGE;
}

/**
 * Whether a chat error should render the generic error bubble. Gate errors
 * (quota/spend) are routed to the ConnectGate/onGate surface instead - never
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

export function AssistantErrorMessage({ error, onRetry }: AssistantErrorMessageProps) {
  return (
    <div className="flex justify-start px-4 pb-1" role="alert">
      <div className="w-fit max-w-[min(85%,56ch)] rounded-2xl rounded-bl-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2 text-sm text-destructive">
        <div className="flex items-start gap-2">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{toFriendlyError(error)}</span>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20"
        >
          <RotateCwIcon className="size-3.5" aria-hidden="true" />
          Try again
        </button>
      </div>
    </div>
  );
}
