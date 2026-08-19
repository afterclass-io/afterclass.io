import { type NextRequest } from "next/server";
import { getFeedData } from "@/server/api/timetable/getFeedData";
import { buildIcal } from "@/modules/timetable/functions/build-ical";

// ---------------------------------------------------------------------------
// GET /api/ical/[token].ics
// ---------------------------------------------------------------------------

/**
 * iCal calendar subscription endpoint.
 *
 * Resolves the `icalToken` from the URL, fetches the timetable data
 * server-side, and returns a valid iCalendar (.ics) feed.
 *
 * Headers:
 * - Content-Type: text/calendar; charset=utf-8
 * - Cache-Control: private, max-age=300 (5 min — feed is per-user capability data)
 * - Content-Disposition: inline; filename="{name}.ics"
 *
 * Responses:
 * - 200 → iCal feed
 * - 404 → token invalid, revoked, or timetable missing
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  // Strip ".ics" extension if present (some clients append it)
  const cleanToken = token.endsWith(".ics") ? token.slice(0, -4) : token;

  const feedData = await getFeedData(cleanToken);
  if (!feedData) {
    return new Response("Not Found", { status: 404 });
  }

  const ics = buildIcal(feedData);

  const safe = feedData.timetableName.replace(/[^a-zA-Z0-9_\- ]/g, "").trim() || "timetable";
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
