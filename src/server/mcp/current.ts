import type { RouterCaller } from "./types";

/**
 * Result of a "resolve the current X" call. `ok: true` carries the resolved
 * value; `ok: false` carries a friendly, model-directed error message that the
 * caller should wrap in `errText(...)` (never a bare `[]`).
 */
export type ResolveResult<T> =
  { ok: true; value: T } | { ok: false; errText: string };

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
 * Normalise an academic term id to the canonical compact DB form
 * (e.g. `AY202627T1`). The compact form passes through upper-cased; the
 * UI-only display form `AY2026/27-T1` converts to compact; anything else
 * passes through trimmed (fail-open so downstream "unknown term" errors
 * still work).
 */
export function normalizeAcadTermId(input: string): string {
  const trimmed = input.trim();
  if (/^AY\d{6}T\w+$/i.test(trimmed)) return trimmed.toUpperCase();
  const display = /^AY(\d{4})\/(\d{2})-(T\w+)$/i.exec(trimmed);
  if (display) {
    return `AY${display[1]}${display[2]}${display[3]}`.toUpperCase();
  }
  return trimmed;
}

/**
 * Resolve the academic term id for a tool call: an explicit (trimmed,
 * normalised) `acadTermId` wins; omitted/empty defaults to the current term.
 * Returns a friendly ask-the-user error when no current term exists.
 * Centralises the "an empty string must never reach SQL" invariant shared by
 * every term-scoped tool.
 */
export async function resolveTermId(
  caller: RouterCaller,
  acadTermId?: string,
): Promise<ResolveResult<string>> {
  const normalized = normalizeAcadTermId(acadTermId ?? "");
  if (normalized) return { ok: true, value: normalized };
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

/** A parsed bid-window alias: round (upper-cased, e.g. "2A") + window number. */
export type BidWindowAlias = { round: string; window: number };

/**
 * Parse a human/compact bid-window alias into `{ round, window }`
 * (case-insensitive). Accepts the compact `r2aw3` / `R2W3` / `r1cw1` form
 * (`r{round}{suffix?}w{window}`) and the long `round 2 window 3` form.
 * Returns `null` when the input is not a recognisable alias.
 */
export function parseBidWindowAlias(input: string): BidWindowAlias | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const compact = /^r(\d+[a-z]?)\s*w\s*(\d+)$/i.exec(trimmed);
  if (compact?.[1] != null && compact[2] != null) {
    return { round: compact[1].toUpperCase(), window: Number(compact[2]) };
  }
  const long = /^round\s+(\d+[a-z]?)\s+(?:window|w)\s*(\d+)$/i.exec(trimmed);
  if (long?.[1] != null && long[2] != null) {
    return { round: long[1].toUpperCase(), window: Number(long[2]) };
  }
  return null;
}

/**
 * Resolve the id of the LATEST bid window: for an explicit (trimmed)
 * `acadTermId`, the last window of that term via
 * `caller.bidWindows.getByAcadTerm` (which returns round/window ascending);
 * otherwise the latest overall window via `caller.bidWindows.getCurrentWindow`.
 *
 * Unlike `resolveOpenWindowIdOrError`, this is for READ-ONLY estimate paths
 * only — never use it to place bids. Returns a friendly error when the term
 * has no windows yet (e.g. a future term) or the lookup fails.
 */
export async function resolveLatestWindowIdOrError(
  caller: RouterCaller,
  acadTermId?: string,
): Promise<ResolveResult<number>> {
  try {
    const trimmed = normalizeAcadTermId(acadTermId ?? "");
    if (trimmed) {
      const windows = await caller.bidWindows.getByAcadTerm({
        acadTermId: trimmed,
      });
      const latest =
        windows.length > 0 ? windows[windows.length - 1] : undefined;
      if (!latest) {
        return {
          ok: false,
          errText: `No bid windows for term ${trimmed} yet — it may be a future term. Ask the user which term to use, or call get-bid-windows and let the user pick.`,
        };
      }
      return { ok: true, value: latest.id };
    }
    const window = await caller.bidWindows.getCurrentWindow();
    if (!window) {
      return {
        ok: false,
        errText:
          "No bid windows exist yet. Ask the user which bid round and window to use, or call get-bid-windows and let the user pick.",
      };
    }
    return { ok: true, value: window.id };
  } catch (e) {
    return {
      ok: false,
      errText: `Could not resolve the latest bid window: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}
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
    value: {
      acadTermId: term.value,
      bidWindowId: window.ok ? window.value : null,
    },
  };
}

/**
 * Pick the list's active entry, falling back to the first entry (or
 * `undefined` for an empty list). Centralises the `find(isActive) ?? [0]`
 * idiom shared by the timetable/roadmap/feasibility tools.
 */
export function pickActiveOrFirst<T extends { isActive?: boolean }>(
  list: T[],
): T | undefined {
  return list.find((t) => t.isActive) ?? list[0];
}

type ClassRow = { id: string; section: string };

/**
 * Resolve a class id by course code + section via `caller.classes.getAll`.
 * Trims inputs; looks up in the given term first (exact-section match —
 * `getAll` already filters exactly, the local filter is defensive), then
 * falls back to a term-agnostic lookup when the term-scoped one is empty.
 * Returns the matched class id, or `null` when nothing matches.
 */
export async function resolveClassIdByCodeSection(
  caller: RouterCaller,
  opts: {
    courseCode: string;
    section: string;
    termId?: string;
    limit?: number;
  },
): Promise<string | null> {
  const courseCode = opts.courseCode.trim();
  const section = opts.section.trim();
  if (!courseCode || !section) return null;
  const limit = opts.limit ?? 5;
  const getAll = (termId?: string) =>
    caller.classes.getAll({
      courseCode,
      section,
      ...(termId ? { acadTermId: termId } : {}),
      limit,
    }) as unknown as Promise<ClassRow[] | null>;
  const pick = (rows: ClassRow[] | null): string | null => {
    const arr = rows ?? [];
    const exact = arr.find((c) => c.section === section);
    if (exact) return exact.id;
    if (arr.length === 1) return arr[0]!.id;
    return null;
  };
  const scoped = await getAll(opts.termId);
  const scopedId = pick(scoped);
  if (scopedId) return scopedId;
  if ((scoped ?? []).length === 0 && opts.termId) {
    return pick(await getAll(undefined));
  }
  return null;
}
