import { NextResponse } from "next/server";

import { env } from "@/env";

/**
 * Shared guard for Vercel Cron routes. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>`; anything else (including direct
 * browser hits) is rejected. When CRON_SECRET is unset every call 500s
 * loudly instead of running unguarded. Local dev may call with
 * `Authorization: Bearer dev` when NODE_ENV is "development".
 * Returns the response to send, or null when the caller may proceed.
 */
export function authorizeCron(req: Request, route: string): NextResponse | null {
  // Canonical env first (CRON_SECRET in the env schema), raw-process
  // fallback for secret-less contexts. Allowlisted raw read.
  const secret = env.CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    // intentional: fail LOUD — running unguarded would expose a DB-writing
    // endpoint to the open internet.
    console.error(`[cron/${route}] CRON_SECRET is not set`);
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  // Allowlisted raw read (dev-only bypass flag, not config).
  const devBypass =
    process.env.NODE_ENV === "development" && auth === "Bearer dev";
  if (auth !== `Bearer ${secret}` && !devBypass) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
