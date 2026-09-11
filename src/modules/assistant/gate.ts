export type ChatGate = "quota" | "consent";

/** Closed classification of chat transport failures for the error bubble.
 *  `null` means "no error bubble" (no error, or a quota/consent gate that
 *  routes to the ConnectGate surface instead). */
export type ChatErrorClass =
  | "rate-limited"
  | "turn-in-flight"
  | "too-large"
  | "invalid-request"
  | "unavailable"
  | "disabled"
  | "unauthorized"
  | "failed";

/** The transport wraps non-2xx responses in an Error whose message contains the body
 * (e.g. `[POST /api/chat] 403: {"gate":"quota"}`). Scan for the gate field anywhere. */
export function parseGateError(error: unknown): ChatGate | null {
  if (!(error instanceof Error)) return null;
  const match = /"gate"\s*:\s*"(quota|consent)"/.exec(error.message);
  return match ? (match[1] as ChatGate) : null;
}

/**
 * Classify a chat transport error into a user-facing bucket. Gate JSON
 * (`"gate":"quota"|"consent"`) takes precedence and returns null so the
 * error bubble never shows for gate errors. Otherwise the HTTP status code
 * is parsed from the transport message (`/ (\d{3}):/` after the method
 * prefix) plus case-insensitive body snippet matching.
 */
export function parseChatError(error: unknown): ChatErrorClass | null {
  if (error == null) return null;
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : null;
  if (message == null) return "failed";
  // Gate JSON takes precedence — bubble must not show.
  if (/"gate"\s*:\s*"(quota|consent)"/.test(message)) return null;
  const lower = message.toLowerCase();
  const statusMatch = / (\d{3}):/.exec(message);
  const status = statusMatch ? statusMatch[1] : null;

  if (lower.includes("a previous turn is still running"))
    return "turn-in-flight";
  if (lower.includes("rate limit exceeded")) return "rate-limited";
  if (lower.includes("request too large")) return "too-large";
  if (lower.includes("invalid request body")) return "invalid-request";
  if (lower.includes("assistant disabled")) return "disabled";
  if (lower.includes("assistant unavailable")) return "unavailable";
  if (lower.includes("unauthorized")) return "unauthorized";

  switch (status) {
    case "429":
      return "rate-limited";
    case "413":
      return "too-large";
    case "400":
      return "invalid-request";
    case "401":
      return "unauthorized";
    case "503":
      return "unavailable";
    default:
      return "failed";
  }
}
