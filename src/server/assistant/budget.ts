import { checkAndIncrement } from "./ratelimit";

/**
 * Single budget primitive for all per-user rate buckets (Task 7).
 *
 * `checkBudget(ctx, opts)` validates `limit > 0 finite` (throws on
 * -1/0/NaN — a misconfigured limit must fail loudly at the call site,
 * never silently 429 the whole world) and delegates to `checkAndIncrement`
 * in `ratelimit.ts`. The four call sites share this one shape:
 * `checkWriteBudget`/`checkReadBudget` (`src/mcp/rate-limit.ts`), the
 * chat-write charge (via `dispatchToolCall` policy in
 * `src/server/assistant/tools.ts`), and the ical throttle
 * (`src/app/api/ical/[token]/route.ts`, per-IP key via a synthetic user
 * id). Key prefixes and limit sources stay identical (no number changes —
 * Task 8 owns numbers).
 */
export type BudgetKind = "read" | "write";
// NOTE: `kind` is a required intent label with no behavioral effect — the
// bucket key derives from `prefix` alone. Kept so call sites declare
// read-vs-write intent; a future pass may assert kind↔prefix family.

export interface BudgetOptions {
  prefix: string;
  limit: number;
  windowMs: number;
  kind: BudgetKind;
}

/**
 * Single budget primitive. One call shape: `checkBudget(ctx, opts)` with the
 * key derived as `<prefix>:<ctx.user.id>`. `kind` is an intent label only
 * (no behavioral effect — the bucket key derives from `prefix` alone).
 * Returns `{ ok, retryAfterSeconds }` from `checkAndIncrement`. Throws on a
 * non-positive or non-finite limit or window.
 */
export async function checkBudget(
  ctx: { user: { id: string } },
  opts: BudgetOptions,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const key = `${opts.prefix}:${ctx.user.id}`;
  const { limit, windowMs } = opts;
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
