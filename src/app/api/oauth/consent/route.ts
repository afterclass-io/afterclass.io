import { getSupabaseAccessToken } from "@/server/auth/supabase-access-token";
import {
  approveConsent,
  denyConsent,
  getConsentDetails,
  issueConsentCsrf,
  resolveConsentCsrfSecret,
  verifyConsentCsrf,
} from "@/server/supabase-consent";

export const runtime = "nodejs";

// Same-origin CSRF guard shared by GET (details) and POST (decision):
// reject cross-origin browser requests. Browsers send Sec-Fetch-Site; the
// consent page's own fetch is "same-origin". Reject when present and not
// same-origin (same-site is a different site — e.g. evil-sub.example.com
// vs app.example.com — so it is rejected too). Fall back to Origin host
// check when absent.
function sameOriginGuard(req: Request): Response | null {
  const secFetchSite = req.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite !== "same-origin") {
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
    const details = await getConsentDetails(authorizationId, token);
    // HMAC synchronizer CSRF token (Task 12, no DB): bound to this session's
    // Supabase access token, verified on POST before approve/deny. When no
    // app secret is configured (secret-less dev), omit the token and skip
    // verification — the same-origin guard remains the backstop.
    const secret = resolveConsentCsrfSecret();
    return Response.json({
      ...details,
      ...(secret ? { csrfToken: issueConsentCsrf(token, secret) } : {}),
    });
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
  // Malformed JSON is a 400, never a 500 (unhandled req.json() throw).
  let body: {
    authorization_id?: string;
    decision?: string;
    csrfToken?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }
  if (!body.authorization_id || !body.decision)
    return Response.json({ error: "bad body" }, { status: 400 });
  if (body.decision !== "approve" && body.decision !== "deny")
    return Response.json({ error: "bad body" }, { status: 400 });
  // CSRF verification (Task 12): the page forwards the GET-issued token;
  // it must verify against this session's access token. Skipped only when
  // no app secret is configured (same-origin guard remains the backstop).
  const csrfSecret = resolveConsentCsrfSecret();
  if (
    csrfSecret &&
    (typeof body.csrfToken !== "string" ||
      !verifyConsentCsrf(body.csrfToken, token, csrfSecret))
  ) {
    return Response.json({ error: "bad csrf" }, { status: 403 });
  }
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
