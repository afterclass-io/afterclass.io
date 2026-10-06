import { NextResponse } from "next/server";

import { authorizeCron } from "@/app/api/cron/authorize-cron";
import { pruneRateLimits } from "@/server/assistant/ratelimit";
import { getChatConfig } from "@/server/config/chat-config";

/**
 * Vercel Cron: RateLimit table GC.
 *
 * Schedule lives in `vercel.json` (`crons`: daily `0 4 * * *`).
 * Guarded by `authorizeCron` (see authorize-cron.ts).
 *
 * pg_cron alternative (documented only): `SELECT cron.schedule('prune-rate-limits', '0 4 * * *', $$DELETE FROM rate_limit WHERE window_start < ...$$)` —
 * kept as a note because it bypasses the app's canonical retention config.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = authorizeCron(req, "prune-rate-limits");
  if (denied) return denied;

  const chat = getChatConfig();
  const { deleted } = await pruneRateLimits(
    chat.rateLimitRetentionWindows,
    chat.rateLimitWindowMinutes,
  );
  return NextResponse.json({ ok: true, deleted });
}
