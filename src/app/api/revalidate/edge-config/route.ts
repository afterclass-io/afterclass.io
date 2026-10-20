import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { authorizeCron } from "@/app/api/cron/authorize-cron";
import { EDGE_CONFIG_CACHE_TAG } from "@/server/ecfg/edge-config";

/**
 * Operator hook: drop the cached Edge Config read so the next request fetches
 * the live store. Call it after changing Edge Config, instead of waiting for
 * the one minute cache window.
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://afterclass.io/api/revalidate/edge-config
 *
 * Guarded by the same bearer secret as the cron routes (see authorize-cron.ts).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = authorizeCron(req, "revalidate-edge-config");
  if (denied) return denied;

  // `expire: 0` never serves the stale entry, so the next render reads live.
  revalidateTag(EDGE_CONFIG_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ ok: true, tag: EDGE_CONFIG_CACHE_TAG });
}
