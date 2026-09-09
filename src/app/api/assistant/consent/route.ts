import { auth } from "@/server/auth";
import { getAiConsentDate, setAiConsentNow } from "@/server/assistant/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const consentedAt = await getAiConsentDate(session.user.id);
  return Response.json({
    consented: consentedAt !== null,
    consentedAt: consentedAt?.toISOString() ?? null,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  let agree: unknown;
  try {
    agree = ((await req.json()) as { agree?: unknown }).agree;
  } catch {
    agree = undefined;
  }
  if (agree !== true)
    return Response.json({ error: "agree must be true" }, { status: 400 });
  const consentedAt = await setAiConsentNow(session.user.id);
  return Response.json({
    consented: true,
    consentedAt: consentedAt.toISOString(),
  });
}
