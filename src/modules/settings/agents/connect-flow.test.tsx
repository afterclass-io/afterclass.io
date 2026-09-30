// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectFlow } from "./connect-flow";

const URL = "https://example.com/api/mcp";

function select(name: string) {
  render(<ConnectFlow mcpUrl={URL} />);
  fireEvent.click(screen.getByRole("button", { name }));
}

describe("ConnectFlow instructions", () => {
  it("chatgpt follows the MCP App flow, not the old plugins flow", () => {
    select("ChatGPT");
    expect(screen.getByText("Open ChatGPT Plugins")).toHaveAttribute(
      "href",
      "https://chatgpt.com/plugins",
    );
    expect(screen.getByText(/create an MCP App/i)).toBeInTheDocument();
    expect(screen.getByText(/Custom Tool/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Under Connection, paste the MCP server URL/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Authentication as required/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Business\/Enterprise\/Edu for full access/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/\+ -> paste the MCP server URL/i),
    ).not.toBeInTheDocument();
  });

  it("gemini no longer shows the account-linking note", () => {
    select("Gemini Spark");
    expect(
      screen.queryByText(/Account linking is required/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/@smu.edu.sg/)).not.toBeInTheDocument();
  });

  it("every provider ends on the same approve copy", () => {
    for (const name of ["Claude", "ChatGPT", "Gemini Spark"]) {
      document.body.innerHTML = "";
      select(name);
      const approves = screen.getAllByText("Approve access");
      expect(approves.length).toBeGreaterThanOrEqual(1);
      expect(
        screen.queryByText("Approve (OAuth) access"),
      ).not.toBeInTheDocument();
    }
    document.body.innerHTML = "";
    select("Claude");
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items[items.length - 1]).toBe("Approve access");
  });
});
