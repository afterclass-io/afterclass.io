import { ConnectPage } from "@/modules/settings/agents/connect-page";
import { MCP_PUBLIC_URL } from "@/modules/settings/agents/connect-links";

export const dynamic = "force-dynamic";

export default function Page() {
  return <ConnectPage mcpUrl={MCP_PUBLIC_URL} />;
}
