import { type NextRequest } from "next/server";
import { getFeedData } from "@/server/api/timetable/getFeedData";
import { buildIcal } from "@/modules/timetable/functions/build-ical";
import { clientKey } from "@/server/api/client-key";
import { checkBudget } from "@/server/assistant/budget";
import { getChatConfigAsync } from "@/server/config/chat-config";

// ---------------------------------------------------------------------------
// GET /api/ical/[token].ics
// ---------------------------------------------------------------------------

/**
 * iCal calendar subscription endpoint.
 *
 * Resolves the `icalToken` from the URL, fetches the timetable data
 * server-side, and returns a valid iCalendar (.ics) feed.
 *
 * Abuse controls:
 * - WAF layer: Vercel WAF rule `rate-limit-ical` limits anonymous floods
 *   (120/min per IP) before the function runs.
 * - Throttle: token-guessing spray against this unauthenticated endpoint is
 *   rate-limited per IP (`ical:<ip>`, 60/min fixed window via the shared
 *   `checkAndIncrement` store). Over-limit callers get 429; the token lookup
 *   never runs.
 * - Expiry: links stop working at the end of the academic term (404,
 *   the same as an invalid link). Revocation exists via `revokeIcalToken`
 *   and `setVisibility` (flipping to PRIVATE revokes the token).
 *   Rotation: owners can rotate the link with `timetable.rotateIcalToken`;
 *   the old link then returns 404.
 *
 * Headers:
 * - Content-Type: text/calendar; charset=utf-8
 * - Cache-Control: private, max-age=300 (5 min — feed is per-user capability data)
 * - Content-Disposition: inline; filename="{name}.ics"
 *
 * Responses:
 * - 200 → iCal feed
 * - 404 → token invalid, revoked, or timetable missing; the term ended;
 *   or the timetable is PRIVATE
 * - 429 → throttled (slow down token-guessing spray)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  // Per-IP throttle (layer 2 behind Vercel WAF) BEFORE the token lookup so
  // spray never reaches the DB.
  // Limit comes from the canonical chat-config (`icalThrottlePerMinute`,
  // default 60 — same number as the old literal, centralized source).
  // Fail-closed: checkBudget throws on a misconfigured limit instead of
  // silently 429ing the whole world.
  const ip = clientKey(req.headers);
  const { icalThrottlePerMinute } = await getChatConfigAsync();
  // `checkBudget` composes the bucket as `<prefix>:<user.id>`, so prefix
  // "ical" + the raw IP keeps the `ical:<ip>` bucket and shared limits.
  const { ok } = await checkBudget(
    { user: { id: ip } },
    {
      prefix: "ical",
      limit: icalThrottlePerMinute,
      windowMs: 60_000,
      kind: "read",
    },
  );
  if (!ok) return new Response("Too many requests", { status: 429 });

  const { token } = await params;

  // Strip ".ics" extension if present (some clients append it)
  const cleanToken = token.endsWith(".ics") ? token.slice(0, -4) : token;

  const feedData = await getFeedData(cleanToken);
  if (!feedData) {
    return new Response("Not Found", { status: 404 });
  }

  const ics = buildIcal(feedData);

  const safe =
    feedData.timetableName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() ||
    "timetable";
  const filename = `${safe}.ics`;

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
