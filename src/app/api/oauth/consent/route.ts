import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import {
  approveConsent,
  denyConsent,
  getConsentDetails,
} from "@/server/supabase-consent";

export const runtime = "nodejs";

// Same-origin CSRF guard shared by GET (details) and POST (decision):
// reject cross-origin browser requests. Browsers send Sec-Fetch-Site; the
// consent page's own fetch is "same-origin". Reject when present and not
// same-origin/same-site. Fall back to Origin host check when absent.
function sameOriginGuard(req: Request): Response | null {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site"
  ) {
    return Response.json({ error: "cross-origin" }, { status: 403 });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const requestHost = new URL(req.url).host;
      if (originHost !== requestHost) {
        return Response.json({ error: "cross-origin" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "cross-origin" }, { status: 403 });
    }
  }
  return null;
}

export async function GET(req: Request) {
  const blocked = sameOriginGuard(req);
  if (blocked) return blocked;
  const token = await getSupabaseAccessToken();
  if (!token)
    return Response.json({ error: "no supabase session" }, { status: 401 });
  const authorizationId = new URL(req.url).searchParams.get("authorization_id");
  if (!authorizationId)
    return Response.json(
      { error: "missing authorization_id" },
      { status: 400 },
    );
  try {
    return Response.json(await getConsentDetails(authorizationId, token));
  } catch (e) {
    // Generic message — provider error detail is logged server-side only so
    // it cannot leak account/session internals to the client.
    console.error("[oauth/consent] getConsentDetails failed", e);
    return Response.json(
      { error: "invalid authorization request" },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  const blocked = sameOriginGuard(req);
  if (blocked) return blocked;

  const token = await getSupabaseAccessToken();
  if (!token)
    return Response.json({ error: "no supabase session" }, { status: 401 });
  const body = (await req.json()) as {
    authorization_id?: string;
    decision?: string;
  };
  if (!body.authorization_id || !body.decision)
    return Response.json({ error: "bad body" }, { status: 400 });
  if (body.decision !== "approve" && body.decision !== "deny")
    return Response.json({ error: "bad body" }, { status: 400 });
  try {
    const { redirectUrl } =
      body.decision === "approve"
        ? await approveConsent(body.authorization_id, token)
        : await denyConsent(body.authorization_id, token);
    return Response.json({ redirectUrl });
  } catch (e) {
    // Generic message — provider error detail is logged server-side only.
    console.error("[oauth/consent] decision failed", e);
    return Response.json({ error: "failed" }, { status: 400 });
  }
}
