// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ConnectFlow } from "./connect-flow";

const URL = "https://example.com/api/mcp";

describe("ConnectFlow step lists (characterization)", () => {
  it("renders a one-click provider's manual steps inside a details block", () => {
    const { container } = render(<ConnectFlow mcpUrl={URL} />);
    fireEvent.click(screen.getByRole("button", { name: "Claude" }));
    expect(container.querySelector("details")?.outerHTML).toMatchInlineSnapshot(
      `"<details class="mt-3 text-sm"><summary class="text-muted-foreground cursor-pointer underline-offset-2 hover:underline">or follow manual steps</summary><ol class="text-muted-foreground mt-2 list-decimal space-y-1 pl-5"><li>Open Claude connectors</li><li>Add custom connector</li><li>Paste the MCP server URL from above</li><li>Approve access</li></ol></details>"`,
    );
  });

  it("renders a provider without one-click steps as a plain ordered list", () => {
    const { container } = render(<ConnectFlow mcpUrl={URL} />);
    fireEvent.click(screen.getByRole("button", { name: "ChatGPT" }));
    expect(container.querySelector("ol")?.outerHTML).toMatchInlineSnapshot(
      `"<ol class="text-muted-foreground list-decimal space-y-1 pl-5 text-sm"><li>Enable Developer mode: Settings -&gt; Security and login</li><li><a href="https://chatgpt.com/plugins" target="_blank" rel="noreferrer" class="hover:text-foreground underline underline-offset-2">Open ChatGPT Plugins</a></li><li>Add (+) a new connection, then create an MCP App</li><li>Fill in a Name, choose Custom Tool, add a short Description (optional)</li><li>Under Connection, paste the MCP server URL from above</li><li>Set Authentication as required and create the connection</li><li>Approve access</li></ol>"`,
    );
  });
});
