import { NextResponse } from "next/server";

import { authorizeCron } from "@/app/api/cron/authorize-cron";
import { getChatConfigAsync } from "@/server/config/chat-config";
import { pruneModerationLogText } from "@/server/moderation/prune";

/**
 * Cron: clear removed text from moderation log rows past retention
 * (`moderationLogRetentionDays`, remote-tunable). Schedule lives in the
 * deployment config `crons` (daily `30 4 * * *`, after the rate-limit
 * prune). Guarded by `authorizeCron`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = authorizeCron(req, "prune-moderation-log");
  if (denied) return denied;

  const cfg = await getChatConfigAsync();
  const { cleared } = await pruneModerationLogText(
    cfg.moderationLogRetentionDays,
  );
  return NextResponse.json({ ok: true, cleared });
}
