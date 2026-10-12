import { TRPCError } from "@trpc/server";

import { checkBudget } from "@/server/assistant/budget";
import { clientKey } from "@/server/api/client-key";

/**
 * Per-IP throttle BEFORE the token lookup (mirrors the iCal route):
 * token-guessing spray against these unauthenticated endpoints draws
 * from a `shared:<ip>` fixed-window bucket (60/min). Over-limit
 * callers get TOO_MANY_REQUESTS; the token lookup never runs.
 */
export async function assertSharedLinkWithinLimit(ctx: {
  headers: Headers;
}): Promise<void> {
  const { ok } = await checkBudget(
    { user: { id: `shared:${clientKey(ctx.headers)}` } },
    { prefix: "shared", limit: 60, windowMs: 60_000, kind: "read" },
  );
  if (!ok) throw new TRPCError({ code: "TOO_MANY_REQUESTS" });
}
