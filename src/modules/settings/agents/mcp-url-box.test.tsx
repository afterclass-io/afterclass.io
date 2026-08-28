// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MCPUrlBox } from "./mcp-url-box";

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: { writeText: vi.fn(async () => undefined) },
  });
});

describe("MCPUrlBox", () => {
  it("renders the URL in a code box with a copy button", () => {
    render(<MCPUrlBox mcpUrl="https://acme.run.mcp-use.com/mcp" />);
    expect(screen.getByText("https://acme.run.mcp-use.com/mcp")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
  });

  it("copies the URL and shows a check for 2s", async () => {
    render(<MCPUrlBox mcpUrl="https://acme.run.mcp-use.com/mcp" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    const clipboard = (navigator as Navigator & {
      clipboard: { writeText: (t: string) => Promise<void> };
    }).clipboard;
    await vi.waitFor(() => expect(clipboard.writeText).toHaveBeenCalledWith("https://acme.run.mcp-use.com/mcp"));
  });
});
