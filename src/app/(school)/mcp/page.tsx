import { headers } from "next/headers";
import { type Metadata } from "next";

import { ConnectPage } from "@/modules/settings/agents/connect-page";
import { resolveMcpUrl } from "@/modules/settings/agents/connect-links";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Page() {
  const heads = await headers();
  const host = heads.get("host") ?? "localhost:3000";
  const mcpUrl = resolveMcpUrl(host, heads.get("x-forwarded-proto"));
  return <ConnectPage mcpUrl={mcpUrl} />;
}
