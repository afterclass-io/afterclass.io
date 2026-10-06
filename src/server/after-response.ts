import { after } from "next/server";

/**
 * Run `task` after the response is sent (Vercel waitUntil semantics: the
 * function stays alive until it settles). MUST be called synchronously in
 * the request scope. Falls back to running inline, un-awaited, where after()
 * is unavailable (unit tests, non-request contexts). `task` must handle its
 * own errors — nothing awaits it.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    void task();
  }
}
