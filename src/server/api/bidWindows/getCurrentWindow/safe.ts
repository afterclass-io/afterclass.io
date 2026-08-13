import * as Sentry from "@sentry/nextjs";

import type { CurrentWindowResult } from "./helpers";

/**
 * Call `bidWindows.getCurrentWindow` from a server component without taking
 * down the page when the query throws (e.g. DB unreachable in dev). The
 * failure is still reported to Sentry; the caller renders its null state.
 */
export async function getCurrentWindowOrNull(
  call: () => Promise<CurrentWindowResult>,
): Promise<CurrentWindowResult> {
  try {
    return await call();
  } catch (error) {
    Sentry.captureException(error);
    return null;
  }
}
