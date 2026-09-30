// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectPage } from "./connect-page";

describe("ConnectPage", () => {
  it("links to the connected-agents management page", () => {
    render(<ConnectPage mcpUrl="https://example.com/api/mcp" />);
    expect(
      screen.getByRole("link", { name: "Manage connected agents" }),
    ).toHaveAttribute("href", "/mcp/connected-agents");
  });
});
