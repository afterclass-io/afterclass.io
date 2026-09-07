import { checkAndIncrement } from "./ratelimit";

/**
 * Single budget primitive for all per-user rate buckets (Task 7).
 *
 * `checkBudget(ctx, kind, opts)` validates `limit > 0 finite` (throws on
 * -1/0/NaN — a misconfigured limit must fail loudly at the call site,
 * never silently 429 the whole world) and delegates to `checkAndIncrement`
 * in `ratelimit.ts`. The three historical call sites migrate onto this:
 * `checkWriteBudget`/`checkReadBudget` (`src/mcp/rate-limit.ts`) and the
 * chat-write charge (`src/server/assistant/tools.ts`). Key prefixes and
 * limit sources stay identical (no number changes — Task 8 owns numbers).
 */
export type BudgetKind = "read" | "write";
// NOTE (Task 8/R15): `kind` is currently a pass-through label with no
// behavioral effect — the bucket key derives from `prefix` alone. Kept so
// call sites declare intent; a future pass may assert kind↔prefix family.

export interface BudgetContext {
  key: string;
  limit: number;
  windowMs: number;
}

export interface BudgetOptions {
  prefix: string;
  limit: number;
  windowMs: number;
}

/**
 * Single budget primitive. Two call shapes are supported (both live — the
 * ical throttle and this file's test use the bare form, R15):
 * - `checkBudget({ key, limit, windowMs }, kind?)` — explicit full key
 * - `checkBudget(ctx, kind, { prefix, limit, windowMs })` — key derived as
 *   `<prefix>:<ctx.user.id>`
 *
 * `kind` is an intent label only (no behavioral effect — the bucket key
 * derives from the explicit `key` / `prefix` alone); it is accepted in both
 * shapes so call sites declare read-vs-write intent.
 * Returns `{ ok, retryAfterSeconds }` from `checkAndIncrement`. Throws on a
 * non-positive or non-finite limit.
 */
export async function checkBudget(
  ctxOrFull: { user: { id: string } } | BudgetContext,
  kindOrOpts?: BudgetKind | BudgetOptions,
  maybeOpts?: BudgetOptions,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  let key: string;
  let limit: number;
  let windowMs: number;
  if (
    kindOrOpts !== undefined &&
    typeof kindOrOpts === "object" &&
    "prefix" in kindOrOpts
  ) {
    const opts = kindOrOpts;
    const ctx = ctxOrFull as { user: { id: string } };
    key = `${opts.prefix}:${ctx.user.id}`;
    limit = opts.limit;
    windowMs = opts.windowMs;
  } else if (maybeOpts !== undefined) {
    const opts = maybeOpts;
    const ctx = ctxOrFull as { user: { id: string } };
    key = `${opts.prefix}:${ctx.user.id}`;
    limit = opts.limit;
    windowMs = opts.windowMs;
  } else {
    const full = ctxOrFull as BudgetContext;
    key = full.key;
    limit = full.limit;
    windowMs = full.windowMs;
  }
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(
      `checkBudget: invalid limit ${String(limit)} for key "${key}" — limit must be a finite number > 0`,
    );
  }
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error(
      `checkBudget: invalid windowMs ${String(windowMs)} for key "${key}" — windowMs must be a finite number > 0`,
    );
  }
  const windowMinutes = windowMs / 60_000;
  return checkAndIncrement(key, limit, windowMinutes);
}
