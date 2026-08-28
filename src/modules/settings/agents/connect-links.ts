// The public MCP endpoint is read from env - set NEXT_PUBLIC_MCP_PUBLIC_URL
// at deploy time (mcp-use hosted URL or self-hosted). Do NOT hardcode a
// <slug> here. The fallback keeps local dev and the settings page working
// until the server is deployed.
import { env } from "@/env";

export const MCP_PUBLIC_URL =
  env.NEXT_PUBLIC_MCP_PUBLIC_URL ?? "https://<slug>.run.mcp-use.com/mcp";

// NOTE: the query params on this deep link (modal / connectorName / connectorUrl)
// are an UNOFFICIAL community convention used by MCP directory sites - they are
// not documented by Anthropic and could break without notice. The manual-steps
// fallback in connect-flow.tsx is the safety net. ChatGPT and Gemini have NO
// deep-link/autofill today (verified against official docs) - manual steps only.
export function buildClaudeDeepLink(mcpUrl: string = MCP_PUBLIC_URL): URL {
  const url = new URL("https://claude.ai/customize/connectors");
  url.searchParams.set("modal", "add-custom-connector");
  url.searchParams.set("connectorName", "afterclass");
  url.searchParams.set("connectorUrl", mcpUrl);
  return url;
}

export function buildCursorDeepLink(mcpUrl: string = MCP_PUBLIC_URL): URL {
  const config = JSON.stringify({ url: mcpUrl });
  return new URL(
    `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent("afterclass")}&config=${encodeURIComponent(config)}`,
  );
}

export function buildVSCodeDeepLink(mcpUrl: string = MCP_PUBLIC_URL): URL {
  const config = JSON.stringify({ url: mcpUrl });
  return new URL(
    `https://vscode.dev/redirect/mcp/install?name=${encodeURIComponent("afterclass")}&config=${encodeURIComponent(config)}`,
  );
}
