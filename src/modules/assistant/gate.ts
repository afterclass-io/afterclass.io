export type ChatGate = "quota" | "spend";

/** The transport wraps non-2xx responses in an Error whose message contains the body
 * (e.g. `[POST /api/chat] 403: {"gate":"quota"}`). Scan for the gate field anywhere. */
export function parseGateError(error: unknown): ChatGate | null {
  if (!(error instanceof Error)) return null;
  const match = /"gate"\s*:\s*"(quota|spend)"/.exec(error.message);
  return match ? (match[1] as ChatGate) : null;
}
