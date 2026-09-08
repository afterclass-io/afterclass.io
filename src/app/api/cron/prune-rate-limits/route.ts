import { NextResponse } from "next/server";

import { env } from "@/env";
import { pruneRateLimits } from "@/server/assistant/ratelimit";
import { getChatConfig } from "@/server/config/chat-config";

/**
 * Vercel Cron: RateLimit table GC (Task 9 — wires Task 7's `pruneRateLimits`).
 *
 * Schedule lives in `vercel.json` (`crons`: daily `0 4 * * *`). Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` on cron invocations; the guard below
 * rejects anything else (including direct browser hits). CRON_SECRET must be
 * set on Vercel (any `openssl rand -base64 32` value); when unset, every
 * invocation 500s loudly instead of running unguarded. Local dev can invoke
 * with `Authorization: Bearer dev` when `NODE_ENV !== "production"`.
 *
 * pg_cron alternative (documented only): `SELECT cron.schedule('prune-rate-limits', '0 4 * * *', $$DELETE FROM rate_limit WHERE window_start < ...$$)` —
 * kept as a note because it bypasses the app's canonical retention config.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Canonical env first (Task 12: CRON_SECRET in the env schema), raw-process
  // fallback for secret-less contexts; loud 500 when unset (never unguarded).
  const secret = env.CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    // intentional: fail LOUD — running GC unguarded would expose a
    // DB-writing endpoint to the open internet.
    console.error("[cron/prune-rate-limits] CRON_SECRET is not set");
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  const devBypass =
    process.env.NODE_ENV !== "production" && auth === "Bearer dev";
  if (auth !== `Bearer ${secret}` && !devBypass) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const chat = getChatConfig();
  const { deleted } = await pruneRateLimits(
    chat.rateLimitRetentionWindows,
    chat.rateLimitWindowMinutes,
  );
  return NextResponse.json({ ok: true, deleted });
}
