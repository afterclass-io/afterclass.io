import { auth } from "@/server/auth";
import { approveConsent, denyConsent, getConsentDetails } from "@/server/supabase-consent";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await auth();
  const token = session?.user?.supabaseAccessToken;
  if (!token) return Response.json({ error: "no supabase session" }, { status: 401 });
  const authorizationId = new URL(req.url).searchParams.get("authorization_id");
  if (!authorizationId) return Response.json({ error: "missing authorization_id" }, { status: 400 });
  try {
    return Response.json(await getConsentDetails(authorizationId, token));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "invalid" }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  const token = session?.user?.supabaseAccessToken;
  if (!token) return Response.json({ error: "no supabase session" }, { status: 401 });
  const body = (await req.json()) as { authorization_id?: string; decision?: "approve" | "deny" };
  if (!body.authorization_id || !body.decision)
    return Response.json({ error: "bad body" }, { status: 400 });
  try {
    const { redirectUrl } =
      body.decision === "approve"
        ? await approveConsent(body.authorization_id, token)
        : await denyConsent(body.authorization_id, token);
    return Response.json({ redirectUrl });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "failed" }, { status: 400 });
  }
}
