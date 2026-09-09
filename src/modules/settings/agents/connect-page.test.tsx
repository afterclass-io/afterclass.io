// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectPage } from "./connect-page";

describe("ConnectPage", () => {
  it("shows a configuration message instead of actions for a placeholder URL", () => {
    render(
      <ConnectPage mcpUrl="https://<slug>.run.mcp-use.com/mcp" />,
    );

    expect(
      screen.getByText(
        "MCP connections are not configured yet. Please try again later.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Copy" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: /One-click set up/ }),
    ).toBeNull();
  });
});