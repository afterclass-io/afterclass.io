import { describe, expect, it } from "vitest";

import { buildClaudeDeepLink, resolveMcpUrl } from "./connect-links";

describe("connect links", () => {
  it("builds the Claude prefill link", () => {
    const url = buildClaudeDeepLink("https://after.test/api/mcp");
    expect(url.origin + url.pathname).toBe(
      "https://claude.ai/customize/connectors",
    );
    expect(url.searchParams.get("modal")).toBe("add-custom-connector");
    expect(url.searchParams.get("connectorUrl")).toBe(
      "https://after.test/api/mcp",
    );
    expect(url.searchParams.get("connectorName")).toBe("afterclass");
  });

  it.each([
    // [host, proto, expected]
    ["afterclass.io", "https", "https://afterclass.io/api/mcp"],
    [
      "afterclass-staging.vercel.app",
      "https",
      "https://afterclass-staging.vercel.app/api/mcp",
    ],
    ["localhost:3000", "http", "http://localhost:3000/api/mcp"],
    ["127.0.0.1:3000", "http", "http://127.0.0.1:3000/api/mcp"],
  ])("resolves the MCP URL for host=%s proto=%s", (host, proto, expected) => {
    expect(resolveMcpUrl(host, proto)).toBe(expected);
  });

  it("defaults localhost to http without a proto", () => {
    expect(resolveMcpUrl("localhost:3000", null)).toBe(
      "http://localhost:3000/api/mcp",
    );
  });

  it("defaults to https without a proto", () => {
    expect(resolveMcpUrl("afterclass.io", null)).toBe(
      "https://afterclass.io/api/mcp",
    );
  });
});
