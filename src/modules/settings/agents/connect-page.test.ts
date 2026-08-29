import { describe, expect, it } from "vitest";
import { buildClaudeDeepLink, isPlaceholderMcpUrl } from "./connect-links";

describe("connect deep links", () => {
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

  it("detects placeholder URLs", () => {
    expect(isPlaceholderMcpUrl("https://<slug>.run.mcp-use.com/mcp")).toBe(
      true,
    );
    expect(isPlaceholderMcpUrl("https://afterclass.run.mcp-use.com/mcp")).toBe(
      false,
    );
  });
});
