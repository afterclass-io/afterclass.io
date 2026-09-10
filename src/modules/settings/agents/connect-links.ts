// The public MCP endpoint lives on this same deployment at /api/mcp.
// The /mcp page derives the origin server-side from request headers and
// passes the full URL down as a prop — no env var, no placeholder fallback.

export function resolveMcpUrl(host: string, proto: string | null): string {
  const normalizedProto = proto ?? (isLocalHost(host) ? "http" : "https");
  return `${normalizedProto}://${host}/api/mcp`;
}

function isLocalHost(host: string): boolean {
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

// NOTE: the query params on this deep link (modal / connectorName / connectorUrl)
// are an UNOFFICIAL community convention used by MCP directory sites - they are
// not documented by Anthropic and could break without notice. The manual-steps
// fallback in connect-flow.tsx is the safety net. ChatGPT and Gemini have NO
// deep-link/autofill today (verified against official docs) - manual steps only.
export function buildClaudeDeepLink(mcpUrl: string): URL {
  const url = new URL("https://claude.ai/customize/connectors");
  url.searchParams.set("modal", "add-custom-connector");
  url.searchParams.set("connectorName", "afterclass");
  url.searchParams.set("connectorUrl", mcpUrl);
  return url;
}
