import * as nextServer from "next/server";

/**
 * Run `task` after the response is sent (Vercel waitUntil semantics: the
 * function stays alive until it settles). MUST be called synchronously in
 * the request scope. Falls back to running inline, un-awaited, where after()
 * is unavailable (unit tests, non-request contexts). `task` must handle its
 * own errors — nothing awaits it.
 *
 * Namespace import on purpose: the MCP bundle shims `next/server` without
 * `after`, so a named import fails the bundle; here the missing member
 * throws on call and takes the inline fallback.
 */
export function runAfterResponse(task: () => Promise<void>): void {
  try {
    nextServer.after(task);
  } catch {
    void task();
  }
}
