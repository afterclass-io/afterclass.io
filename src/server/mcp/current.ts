import type { RouterCaller } from "./types";

/**
 * Result of a "resolve the current X" call. `ok: true` carries the resolved
 * value; `ok: false` carries a friendly, model-directed error message that the
 * caller should wrap in `errText(...)` (never a bare `[]`).
 */
export type ResolveResult<T> = { ok: true; value: T } | { ok: false; errText: string };

/**
 * Resolve the current academic term's id via the existing cached tRPC
 * procedure `caller.acadTerms.current()` (getCurrentAcadTerm, cached 24h,
 * tag "acad-terms").
 *
 * Returns `{ ok: true, value: termId }`, or a friendly error telling the model
 * to ask the user which term when no current term exists (or the procedure
 * fails). Never returns a bare `[]`.
 */
export async function resolveTermIdOrError(
  caller: RouterCaller,
): Promise<ResolveResult<string>> {
  try {
    const term = await caller.acadTerms.current();
    if (!term) {
      return {
        ok: false,
        errText:
          "There is no current academic term in the system. Ask the user which academic term to use, or call list-acad-terms and let the user pick.",
      };
    }
    return { ok: true, value: term.id };
  } catch (e) {
    return {
      ok: false,
      errText: `Could not resolve the current academic term: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

/**
 * Resolve the academic term id for a tool call: an explicit (trimmed)
 * `acadTermId` wins; omitted/empty defaults to the current term. Returns a
 * friendly ask-the-user error when no current term exists. Centralises the
 * "an empty string must never reach SQL" invariant shared by every
 * term-scoped tool.
 */
export async function resolveTermId(
  caller: RouterCaller,
  acadTermId?: string,
): Promise<ResolveResult<string>> {
  const trimmed = acadTermId?.trim() ?? "";
  if (trimmed) return { ok: true, value: trimmed };
  return resolveTermIdOrError(caller);
}

/**
 * Resolve the id of the currently OPEN bid window via
 * `caller.bidWindows.getCurrentWindow()`.
 *
 * `getCurrentWindowLogic` has a 3-level active → upcoming → past fallback, so
 * its result must be VERIFIED to actually be active (`opensAt <= now <
 * resultsAt`) before use — silently placing a bid in an upcoming/past window
 * is a real risk. If nothing is open (or the lookup fails), returns a friendly
 * error instructing the model to ask the user for the round + window (or call
 * get-bid-windows and let the user pick).
 */
export async function resolveOpenWindowIdOrError(
  caller: RouterCaller,
  now: Date = new Date(),
): Promise<ResolveResult<number>> {
  try {
    const window = await caller.bidWindows.getCurrentWindow();
    const isOpen =
      !!window &&
      !!window.opensAt &&
      !!window.resultsAt &&
      window.opensAt <= now &&
      now < window.resultsAt;
    if (!isOpen) {
      return {
        ok: false,
        errText:
          "No bid window is currently open for bidding. Ask the user which bid round and window to use, or call get-bid-windows and let the user pick.",
      };
    }
    return { ok: true, value: window.id };
  } catch (e) {
    return {
      ok: false,
      errText: `Could not resolve the current open bid window: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

/** The current context for tools that need both term and window. */
export type CurrentContext = { acadTermId: string; bidWindowId: number | null };

/**
 * Resolve both the current academic term and the current open bid window for
 * tools needing both. The term is required (error when absent); the window is
 * nullable — `bidWindowId` is simply `null` when no window is open.
 */
export async function resolveCurrentContext(
  caller: RouterCaller,
  now?: Date,
): Promise<ResolveResult<CurrentContext>> {
  const term = await resolveTermIdOrError(caller);
  if (!term.ok) return term;
  const window = await resolveOpenWindowIdOrError(caller, now);
  return {
    ok: true,
    value: { acadTermId: term.value, bidWindowId: window.ok ? window.value : null },
  };
}
