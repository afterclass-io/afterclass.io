import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { env } from "@/env";

/**
 * Vercel Cron / workflow hook: invalidate the cached Edge Config read.
 *
 * The root layout's `getEdgeConfig()` caches the validated read for 24h under
 * the `"edge-config"` tag. `.github/workflows/update-edge-config.yml` calls
 * this route after pushing a config change so it propagates without a deploy.
 * Same guard as `cron/prune-rate-limits`: CRON_SECRET must be set (loud 500
 * otherwise), the bearer must match, and local dev may use `Bearer dev` when
 * `NODE_ENV !== "production"`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Canonical env first (CRON_SECRET in the env schema), raw-process
  // fallback for secret-less contexts; loud 500 when unset (never unguarded).
  const secret = env.CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/revalidate-edge-config] CRON_SECRET is not set");
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  const devBypass =
    process.env.NODE_ENV !== "production" && auth === "Bearer dev";
  if (auth !== `Bearer ${secret}` && !devBypass) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  revalidateTag("edge-config", "max");
  return NextResponse.json({ ok: true });
}
