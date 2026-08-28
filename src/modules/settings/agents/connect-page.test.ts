import { describe, expect, it } from "vitest";
import { buildClaudeDeepLink, buildCursorDeepLink, buildVSCodeDeepLink } from "./connect-links";

describe("connect deep links", () => {
  it("builds the Claude prefill link", () => {
    const url = buildClaudeDeepLink("https://after.test/api/mcp");
    expect(url.origin + url.pathname).toBe("https://claude.ai/customize/connectors");
    expect(url.searchParams.get("modal")).toBe("add-custom-connector");
    expect(url.searchParams.get("connectorUrl")).toBe("https://after.test/api/mcp");
    expect(url.searchParams.get("connectorName")).toBe("afterclass");
  });

  it("builds the Cursor deep link", () => {
    const url = buildCursorDeepLink("https://after.test/api/mcp");
    expect(url.protocol).toBe("cursor:");
    expect(url.searchParams.get("config")).toBeDefined();
  });

  it("builds the VS Code deep link", () => {
    const url = buildVSCodeDeepLink("https://after.test/api/mcp");
    expect(url.host).toContain("vscode.dev");
    expect(url.searchParams.get("config")).toBeDefined();
  });
});
